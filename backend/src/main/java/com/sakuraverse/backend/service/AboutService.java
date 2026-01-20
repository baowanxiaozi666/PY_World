package com.sakuraverse.backend.service;

import com.sakuraverse.backend.entity.AboutProfile;

public interface AboutService {
    AboutProfile getProfile();
    void updateProfile(AboutProfile profile);
}