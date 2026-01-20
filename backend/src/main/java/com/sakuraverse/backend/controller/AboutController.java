package com.sakuraverse.backend.controller;

import com.sakuraverse.backend.common.Result;
import com.sakuraverse.backend.entity.AboutProfile;
import com.sakuraverse.backend.service.AboutService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AboutController {

    @Autowired
    private AboutService aboutService;

    // Public Endpoint
    @GetMapping("/about")
    public Result<AboutProfile> getAboutInfo() {
        return Result.success(aboutService.getProfile());
    }

    // Admin Endpoint (Protected by Interceptor via /api/admin/** path)
    @PutMapping("/admin/about")
    public Result<Void> updateAboutInfo(@RequestBody AboutProfile profile) {
        aboutService.updateProfile(profile);
        return Result.success();
    }
}