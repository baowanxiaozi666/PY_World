package com.sakuraverse.backend.service.impl;

import com.sakuraverse.backend.entity.IPUsername;
import com.sakuraverse.backend.mapper.IPUsernameMapper;
import com.sakuraverse.backend.service.IPUsernameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class IPUsernameServiceImpl implements IPUsernameService {

    @Autowired
    private IPUsernameMapper ipUsernameMapper;

    private static final String[] ADJECTIVES = {
        "Cool", "Bright", "Swift", "Brave", "Wise", "Kind", "Gentle", "Bold",
        "Calm", "Eager", "Happy", "Lucky", "Magic", "Noble", "Quiet", "Rapid",
        "Silent", "Vivid", "Wild", "Zen", "Epic", "Mystic", "Cosmic", "Neon"
    };

    private static final String[] NOUNS = {
        "Panda", "Dragon", "Phoenix", "Tiger", "Wolf", "Eagle", "Fox", "Bear",
        "Hawk", "Lion", "Shark", "Falcon", "Raven", "Stag", "Swan", "Owl",
        "Star", "Moon", "Sun", "Cloud", "Wave", "Storm", "Light", "Shadow"
    };

    private final Random random = new Random();

    @Override
    public String getOrCreateUsername(String ipAddress) {
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            ipAddress = "unknown";
        }

        // Try to get existing username
        IPUsername existing = ipUsernameMapper.selectByIP(ipAddress);
        if (existing != null) {
            return existing.getUsername();
        }

        // Generate a random username
        String username = generateRandomUsername();

        // Create new mapping
        IPUsername ipUsername = new IPUsername();
        ipUsername.setIpAddress(ipAddress);
        ipUsername.setUsername(username);
        ipUsernameMapper.insert(ipUsername);

        return username;
    }

    private String generateRandomUsername() {
        String adjective = ADJECTIVES[random.nextInt(ADJECTIVES.length)];
        String noun = NOUNS[random.nextInt(NOUNS.length)];
        int number = random.nextInt(9999);
        return adjective + noun + number;
    }
}
