package com.sakuraverse.backend.controller;

import com.sakuraverse.backend.common.Result;
import com.sakuraverse.backend.entity.MusicTrack;
import com.sakuraverse.backend.service.MusicService;
import javax.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
    
    // Public: Stream Music from File System with Range Support (Critical for Seeking & Safari)
    @GetMapping("/music/stream/{id}")
    public void streamMusic(@PathVariable Long id, 
                          @RequestHeader(value = "Range", required = false) String rangeHeader,
                          HttpServletResponse response) {
        MusicTrack track = musicService.getMusicContent(id);
        if (track == null) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        // Get file path from track
        String filePath = track.getUrl();
        if (filePath == null || filePath.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        
        // Convert relative path (./Music/xxx.mp3) to absolute path
        String projectRoot = System.getProperty("user.dir");
        String fullPath;
        if (filePath.startsWith("./Music/")) {
            fullPath = projectRoot + File.separator + filePath.substring(2); // Remove "./" prefix
        } else if (filePath.startsWith("Music/")) {
            fullPath = projectRoot + File.separator + filePath;
        } else {
            // Legacy: if it's an external URL or old format, try to handle
            // For now, assume it's a file path
            fullPath = projectRoot + File.separator + filePath;
        }
        
        Path path = Paths.get(fullPath);
        File file = path.toFile();
        
        if (!file.exists() || !file.isFile()) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        
        long totalLength = file.length();
        
        // Calculate Range
        long start = 0;
        long end = totalLength - 1;
        
        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String[] ranges = rangeHeader.substring(6).split("-");
            try {
                start = Long.parseLong(ranges[0]);
                if (ranges.length > 1 && !ranges[1].isEmpty()) {
                    end = Long.parseLong(ranges[1]);
                }
            } catch (NumberFormatException e) {
                // Ignore invalid range, default to full content
            }
        }
        
        // Bounds check
        if (start < 0) start = 0;
        if (end >= totalLength) end = totalLength - 1;
        long contentLength = end - start + 1;

        // Set Headers
        response.setContentType(track.getContentType() != null ? track.getContentType() : "audio/mpeg");
        response.setHeader("Accept-Ranges", "bytes");
        // Inline disposition lets the browser play it; Attachment forces download
        try {
            response.setHeader("Content-Disposition", "inline; filename=\"" + 
                    URLEncoder.encode(track.getTitle(), StandardCharsets.UTF_8.toString()) + ".mp3\"");
        } catch (Exception e) {
            // Fallback
        }

        try (InputStream is = new FileInputStream(file);
             OutputStream os = response.getOutputStream()) {
            
            // Skip to start position
            if (start > 0) {
                is.skip(start);
            }
            
            if (rangeHeader != null) {
                // Partial Content for Seeking
                response.setStatus(HttpServletResponse.SC_PARTIAL_CONTENT);
                response.setHeader("Content-Range", String.format("bytes %d-%d/%d", start, end, totalLength));
                response.setContentLengthLong(contentLength);
            } else {
                // Full Content
                response.setStatus(HttpServletResponse.SC_OK);
                response.setContentLengthLong(totalLength);
            }
            
            // Stream file content
            byte[] buffer = new byte[8192];
            long remaining = contentLength;
            while (remaining > 0) {
                int bytesRead = is.read(buffer, 0, (int) Math.min(buffer.length, remaining));
                if (bytesRead == -1) {
                    break;
                }
                os.write(buffer, 0, bytesRead);
                remaining -= bytesRead;
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