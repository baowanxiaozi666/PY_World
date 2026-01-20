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
            return cached;
        }

        List<MusicTrack> list = musicMapper.selectAll();
        
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

        if (list != null && !list.isEmpty()) {
            redisTemplate.opsForValue().set(CACHE_KEY, list, 24, TimeUnit.HOURS);
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
        MusicTrack track = new MusicTrack();
        track.setTitle(title);
        track.setArtist(artist);
        track.setCoverUrl(coverUrl);
        track.setContentType(file.getContentType());
        track.setFileData(file.getBytes());
        track.setUrl(null); // Explicitly null for DB uploads
        
        musicMapper.insert(track);
        redisTemplate.delete(CACHE_KEY);
    }

    @Override
    public void deleteMusic(Long id) {
        musicMapper.delete(id);
        redisTemplate.delete(CACHE_KEY);
    }
}