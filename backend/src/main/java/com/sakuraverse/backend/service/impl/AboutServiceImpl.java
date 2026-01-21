package com.sakuraverse.backend.service.impl;

import com.sakuraverse.backend.entity.AboutProfile;
import com.sakuraverse.backend.mapper.AboutMapper;
import com.sakuraverse.backend.service.AboutService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.PostConstruct;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class AboutServiceImpl implements AboutService {

    @Autowired
    private AboutMapper aboutMapper;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_KEY = "about:info";
    
    /**
     * Initialize profile cache from database on application startup
     */
    @PostConstruct
    public void initProfileCache() {
        try {
            log.info("Initializing profile cache from database...");
            AboutProfile profile = aboutMapper.selectProfile();
            if (profile != null) {
                redisTemplate.opsForValue().set(CACHE_KEY, profile, 24, TimeUnit.HOURS);
                log.info("Profile cache initialized successfully: {}", profile.getDisplayName());
            } else {
                log.warn("No profile found in database during initialization");
            }
        } catch (Exception e) {
            log.error("Failed to initialize profile cache from database: {}", e.getMessage(), e);
        }
    }

    @Override
    public AboutProfile getProfile() {
        // Try Cache First
        AboutProfile cached = (AboutProfile) redisTemplate.opsForValue().get(CACHE_KEY);
        if (cached != null) {
            return cached;
        }

        // DB Fallback
        AboutProfile profile = aboutMapper.selectProfile();
        if (profile != null) {
            redisTemplate.opsForValue().set(CACHE_KEY, profile, 24, TimeUnit.HOURS);
        }
        return profile;
    }

    @Override
    @Transactional
    public void updateProfile(AboutProfile profile) {
        // Ensure id is set to 1 (singleton pattern)
        if (profile.getId() == null) {
            profile.setId(1);
        }
        
        // Update database
        int affectedRows = aboutMapper.updateProfile(profile);
        
        // Verify update was successful
        if (affectedRows == 0) {
            // If no rows were affected, the record might not exist, so insert it
            aboutMapper.insertProfile(profile);
        }
        
        // Clear cache to force refresh from database
        redisTemplate.delete(CACHE_KEY);
        
        // Optionally, immediately refresh cache with new data
        redisTemplate.opsForValue().set(CACHE_KEY, profile, 24, TimeUnit.HOURS);
    }
}