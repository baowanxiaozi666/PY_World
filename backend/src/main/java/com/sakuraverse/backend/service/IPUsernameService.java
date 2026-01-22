package com.sakuraverse.backend.service;

public interface IPUsernameService {
    String getOrCreateUsername(String ipAddress);
}
