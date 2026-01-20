package com.sakuraverse.backend.service;

import com.sakuraverse.backend.entity.User;
import java.util.Map;

public interface AuthService {
    Map<String, Object> login(String username, String password);
    void logout(String token);
    User validateToken(String token);
}