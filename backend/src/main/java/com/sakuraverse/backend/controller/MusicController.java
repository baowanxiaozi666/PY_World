package com.sakuraverse.backend.controller;

import com.sakuraverse.backend.common.Result;
import com.sakuraverse.backend.entity.MusicTrack;
import com.sakuraverse.backend.service.MusicService;
import javax.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api")
public class MusicController {

    @Autowired
    private MusicService musicService;

    // Public: Get Playlist
    @GetMapping("/music")
    public Result<List<MusicTrack>> getPlaylist() {
        return Result.success(musicService.getAllMusic());
    }
    
    // Public: Stream Music from DB with Range Support (Critical for Seeking & Safari)
    @GetMapping("/music/stream/{id}")
    public void streamMusic(@PathVariable Long id, 
                          @RequestHeader(value = "Range", required = false) String rangeHeader,
                          HttpServletResponse response) {
        MusicTrack track = musicService.getMusicContent(id);
        if (track == null || track.getFileData() == null) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        byte[] data = track.getFileData();
        int totalLength = data.length;
        
        // Calculate Range
        int start = 0;
        int end = totalLength - 1;
        
        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String[] ranges = rangeHeader.substring(6).split("-");
            try {
                start = Integer.parseInt(ranges[0]);
                if (ranges.length > 1 && !ranges[1].isEmpty()) {
                    end = Integer.parseInt(ranges[1]);
                }
            } catch (NumberFormatException e) {
                // Ignore invalid range, default to full content
            }
        }
        
        // Bounds check
        if (start < 0) start = 0;
        if (end >= totalLength) end = totalLength - 1;
        int contentLength = end - start + 1;

        // Set Headers
        response.setContentType(track.getContentType());
        response.setHeader("Accept-Ranges", "bytes");
        // Inline disposition lets the browser play it; Attachment forces download
        try {
            response.setHeader("Content-Disposition", "inline; filename=\"" + 
                    URLEncoder.encode(track.getTitle(), StandardCharsets.UTF_8.toString()) + ".mp3\"");
        } catch (Exception e) {
            // Fallback
        }

        try (OutputStream os = response.getOutputStream()) {
            if (rangeHeader != null) {
                // Partial Content for Seeking
                response.setStatus(HttpServletResponse.SC_PARTIAL_CONTENT);
                response.setHeader("Content-Range", String.format("bytes %d-%d/%d", start, end, totalLength));
                response.setContentLength(contentLength);
                os.write(data, start, contentLength);
            } else {
                // Full Content
                response.setStatus(HttpServletResponse.SC_OK);
                response.setContentLength(totalLength);
                os.write(data);
            }
            response.flushBuffer();
        } catch (IOException e) {
            // Client aborted connection (common during streaming/seeking)
            // Do not log stack trace to keep logs clean
        }
    }

    // Admin: Add Music with DB Storage (Consumes Multipart)
    @PostMapping("/admin/music")
    public Result<Void> addMusic(
            @RequestParam("title") String title,
            @RequestParam("artist") String artist,
            @RequestParam(value = "coverUrl", required = false) String coverUrl,
            @RequestParam("file") MultipartFile file) {
        
        if (file == null || file.isEmpty()) {
            return Result.error(400, "Music file is required");
        }
        
        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("audio/")) {
            return Result.error(400, "Invalid file type. Please upload an audio file (MP3, WAV, etc.)");
        }
        
        // Validate file size (200MB limit from application.yml)
        if (file.getSize() > 200 * 1024 * 1024) {
            return Result.error(400, "File size exceeds 200MB limit");
        }
        
        try {
            musicService.addMusic(title, artist, coverUrl != null ? coverUrl : "", file);
            return Result.success();
        } catch (IllegalArgumentException e) {
            return Result.error(400, e.getMessage());
        } catch (IOException e) {
            return Result.error(500, "Failed to store music file: " + e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "Unexpected error: " + e.getMessage());
        }
    }

    // Admin: Delete Music
    @DeleteMapping("/admin/music/{id}")
    public Result<Void> deleteMusic(@PathVariable Long id) {
        if (id == null) {
            return Result.error(400, "Music ID is required");
        }
        
        try {
            musicService.deleteMusic(id);
            return Result.success();
        } catch (IllegalArgumentException e) {
            return Result.error(404, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "Failed to delete music: " + e.getMessage());
        }
    }
}