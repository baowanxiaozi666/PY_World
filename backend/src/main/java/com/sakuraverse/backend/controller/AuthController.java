package com.sakuraverse.backend.controller;

import com.sakuraverse.backend.common.Result;
import com.sakuraverse.backend.dto.LoginRequest;
import com.sakuraverse.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public Result<Map<String, Object>> login(@RequestBody LoginRequest loginRequest) {
        // Use DTO getter
        Map<String, Object> result = authService.login(loginRequest.getUsername(), loginRequest.getPassword());
        return Result.success(result);
    }

    @PostMapping("/logout")
    public Result<Void> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.logout(token);
        }
        return Result.success();
    }
}