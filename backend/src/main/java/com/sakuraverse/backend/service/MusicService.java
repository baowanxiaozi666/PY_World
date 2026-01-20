package com.sakuraverse.backend.service;

import com.sakuraverse.backend.entity.MusicTrack;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface MusicService {
    List<MusicTrack> getAllMusic();
    MusicTrack getMusicContent(Long id);
    void addMusic(String title, String artist, String coverUrl, MultipartFile file) throws IOException;
    void deleteMusic(Long id);
}