package com.sakuraverse.backend.service.impl;

import com.sakuraverse.backend.entity.MusicTrack;
import com.sakuraverse.backend.mapper.MusicMapper;
import com.sakuraverse.backend.service.MusicService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.util.List;
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
        if (cached != null) {
            // Verify cached tracks still exist in database
            List<MusicTrack> verified = new java.util.ArrayList<>();
            for (MusicTrack track : cached) {
                if (track != null && track.getId() != null) {
                    // Quick check: verify the track still exists in DB
                    MusicTrack dbTrack = musicMapper.selectById(track.getId());
                    if (dbTrack != null) {
                        verified.add(track);
                    }
                }
            }
            // If some tracks were removed, update cache
            if (verified.size() != cached.size()) {
                redisTemplate.delete(CACHE_KEY);
                // Continue to fetch fresh data from DB
            } else if (!verified.isEmpty()) {
                return verified;
            }
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
        
        // Construct the streaming URL for the frontend ONLY if external URL is missing
        list.forEach(track -> {
            // Logic: If the track in DB has no URL (meaning it's a blob upload), generate stream URL
            // If it HAS a URL (like initial data), keep it as is.
            if (track.getUrl() == null || track.getUrl().isEmpty()) {
                String streamUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                        .path("/api/music/stream/")
                        .path(String.valueOf(track.getId()))
                        .toUriString();
                track.setUrl(streamUrl);
            }
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
        // No caching for BLOBs in Redis to avoid memory issues
        return musicMapper.selectById(id);
    }

    @Override
    public void addMusic(String title, String artist, String coverUrl, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Music file cannot be empty");
        }
        
        byte[] fileData = file.getBytes();
        if (fileData == null || fileData.length == 0) {
            throw new IllegalArgumentException("Music file data is empty");
        }
        
        MusicTrack track = new MusicTrack();
        track.setTitle(title);
        track.setArtist(artist);
        track.setCoverUrl(coverUrl);
        track.setContentType(file.getContentType() != null ? file.getContentType() : "audio/mpeg");
        track.setFileData(fileData);
        track.setUrl(null); // Explicitly null for DB uploads (will be generated as stream URL)
        
        musicMapper.insert(track);
        
        // Verify the insert was successful
        if (track.getId() == null) {
            throw new RuntimeException("Failed to insert music track: ID was not generated");
        }
        
        // Clear cache to ensure new music appears immediately
        redisTemplate.delete(CACHE_KEY);
        
        System.out.println("Music saved successfully: ID=" + track.getId() + ", Title=" + title + ", Size=" + fileData.length + " bytes");
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