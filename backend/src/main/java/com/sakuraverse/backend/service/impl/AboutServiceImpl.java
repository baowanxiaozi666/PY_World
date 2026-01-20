package com.sakuraverse.backend.service.impl;

import com.sakuraverse.backend.entity.AboutProfile;
import com.sakuraverse.backend.mapper.AboutMapper;
import com.sakuraverse.backend.service.AboutService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.TimeUnit;

@Service
public class AboutServiceImpl implements AboutService {

    @Autowired
    private AboutMapper aboutMapper;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_KEY = "about:info";

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
        aboutMapper.updateProfile(profile);
        // Clear Cache
        redisTemplate.delete(CACHE_KEY);
    }
}