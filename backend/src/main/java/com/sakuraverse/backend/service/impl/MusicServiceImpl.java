package com.sakuraverse.backend.service.impl;

import com.sakuraverse.backend.entity.MusicTrack;
import com.sakuraverse.backend.mapper.MusicMapper;
import com.sakuraverse.backend.service.MusicService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class MusicServiceImpl implements MusicService {

    @Autowired
    private MusicMapper musicMapper;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_KEY = "music:playlist";

    @Override
    public List<MusicTrack> getAllMusic() {
        // Note: Cached tracks don't have fileData, so they are small
        List<MusicTrack> cached = (List<MusicTrack>) redisTemplate.opsForValue().get(CACHE_KEY);
        if (cached != null && !cached.isEmpty()) {
            return cached;
        }

        // Fetch fresh data from database
        List<MusicTrack> list = musicMapper.selectAll();
        
        if (list == null) {
            return new java.util.ArrayList<>();
        }
        
        // Filter out any null or invalid tracks
        list = list.stream()
                .filter(track -> track != null && track.getId() != null)
                .collect(Collectors.toList());
        
        // Construct the streaming URL for the frontend
        list.forEach(track -> {
            // If track has a file path (./Music/xxx.mp3), generate stream URL
            // Otherwise, if it's an external URL, keep it as is
            String url = track.getUrl();
            if (url == null || url.isEmpty()) {
                // Legacy: if no URL, generate stream URL (for old data)
                String streamUrl = "/api/music/stream/" + track.getId();
                track.setUrl(streamUrl);
            } else if (url.startsWith("./Music/")) {
                // File system path: generate stream URL
                String streamUrl = "/api/music/stream/" + track.getId();
                track.setUrl(streamUrl);
            } else if (url.contains("/api/music/stream/")) {
                // Already a stream URL, ensure it's relative
                int streamIndex = url.indexOf("/api/music/stream/");
                if (streamIndex >= 0) {
                    track.setUrl(url.substring(streamIndex));
                }
            }
            // External URLs are kept as is
        });

        if (!list.isEmpty()) {
            redisTemplate.opsForValue().set(CACHE_KEY, list, 24, TimeUnit.HOURS);
        } else {
            // Clear cache if no music exists
            redisTemplate.delete(CACHE_KEY);
        }
        return list;
    }

    @Override
    public MusicTrack getMusicContent(Long id) {
        // Return track metadata (including file path)
        return musicMapper.selectById(id);
    }

    @Override
    public void addMusic(String title, String artist, String coverUrl, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Music file cannot be empty");
        }
        
        // Get original filename and extension
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        } else {
            // Default to .mp3 if no extension
            extension = ".mp3";
        }
        
        // Create Music directory if it doesn't exist
        String projectRoot = System.getProperty("user.dir");
        String musicDirPath = projectRoot + File.separator + "Music";
        File musicDir = new File(musicDirPath);
        if (!musicDir.exists()) {
            musicDir.mkdirs();
        }
        
        // Generate unique filename: use UUID to avoid conflicts
        String fileName = UUID.randomUUID().toString().replace("-", "") + extension;
        String filePath = musicDirPath + File.separator + fileName;
        
        // Save file to filesystem
        Path targetPath = Paths.get(filePath);
        Files.copy(file.getInputStream(), targetPath);
        
        // Store file path in database (relative path: ./Music/xxx.mp3)
        String relativePath = "./Music/" + fileName;
        
        MusicTrack track = new MusicTrack();
        track.setTitle(title);
        track.setArtist(artist);
        track.setCoverUrl(coverUrl);
        track.setContentType(file.getContentType() != null ? file.getContentType() : "audio/mpeg");
        track.setUrl(relativePath); // Store file path instead of file data
        
        musicMapper.insert(track);
        
        // Verify the insert was successful
        if (track.getId() == null) {
            // If insert failed, delete the saved file
            Files.deleteIfExists(targetPath);
            throw new RuntimeException("Failed to insert music track: ID was not generated");
        }
        
        // Clear cache to ensure new music appears immediately
        redisTemplate.delete(CACHE_KEY);
        
        System.out.println("Music saved successfully: ID=" + track.getId() + ", Title=" + title + ", File=" + filePath);
    }

    @Override
    public void deleteMusic(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("Music ID cannot be null");
        }
        
        // Check if music exists before deleting
        MusicTrack existingTrack = musicMapper.selectById(id);
        if (existingTrack == null) {
            throw new IllegalArgumentException("Music track with ID " + id + " does not exist");
        }
        
        // Delete file from filesystem if path exists
        String filePath = existingTrack.getUrl();
        if (filePath != null && filePath.startsWith("./Music/")) {
            try {
                String projectRoot = System.getProperty("user.dir");
                String fullPath = projectRoot + File.separator + filePath.substring(2); // Remove "./" prefix
                Path path = Paths.get(fullPath);
                Files.deleteIfExists(path);
                System.out.println("Deleted music file: " + fullPath);
            } catch (IOException e) {
                // Log error but continue with database deletion
                System.err.println("Failed to delete music file: " + filePath + ", Error: " + e.getMessage());
            }
        }
        
        // Delete from database
        int deletedRows = musicMapper.delete(id);
        if (deletedRows == 0) {
            throw new RuntimeException("Failed to delete music track: No rows affected (ID may not exist)");
        }
        
        // Clear cache to ensure deleted music disappears immediately
        redisTemplate.delete(CACHE_KEY);
        
        System.out.println("Music deleted successfully: ID=" + id + ", Title=" + existingTrack.getTitle());
    }
}