package com.sakuraverse.backend.service.impl;

import com.sakuraverse.backend.entity.User;
import com.sakuraverse.backend.mapper.UserMapper;
import com.sakuraverse.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    // Token valid for 6 hours
    private static final long TOKEN_EXPIRY_HOURS = 6;

    @Override
    public Map<String, Object> login(String username, String password) {
        User user = userMapper.findByUsername(username);

        // Simple password check (In prod, use BCryptPasswordEncoder)
        if (user == null || !user.getPassword().equals(password)) {
            throw new RuntimeException("Invalid username or password");
        }

        // Generate a random UUID as the token
        String token = UUID.randomUUID().toString();
        
        // Redis Key: login:token:{uuid}
        String tokenKey = "login:token:" + token;

        // Store User object in Redis with 6 hours expiration
        redisTemplate.opsForValue().set(tokenKey, user, TOKEN_EXPIRY_HOURS, TimeUnit.HOURS);

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", user);
        return result;
    }

    @Override
    public void logout(String token) {
        if (token != null && !token.isEmpty()) {
            String tokenKey = "login:token:" + token;
            redisTemplate.delete(tokenKey);
        }
    }
    
    @Override
    public User validateToken(String token) {
        String tokenKey = "login:token:" + token;
        return (User) redisTemplate.opsForValue().get(tokenKey);
    }
}