package com.sakuraverse.backend.controller;

import com.sakuraverse.backend.common.Result;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class UploadController {

    // Allowed extensions for security
    private static final String[] ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg"};
    private static final String[] ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"};
    private static final String[] ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm"};

    @PostMapping("/upload")
    public Result<String> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return Result.error(400, "File cannot be empty");
        }

        String originalFilename = file.getOriginalFilename();
        String suffix = originalFilename != null ? originalFilename.substring(originalFilename.lastIndexOf(".")) : "";
        String lowerSuffix = suffix.toLowerCase();

        // Determine directory based on type
        String subDir = "others";
        if (isAllowed(lowerSuffix, ALLOWED_AUDIO_EXTENSIONS)) {
            subDir = "music";
        } else if (isAllowed(lowerSuffix, ALLOWED_IMAGE_EXTENSIONS)) {
            subDir = "images";
        } else if (isAllowed(lowerSuffix, ALLOWED_VIDEO_EXTENSIONS)) {
            subDir = "videos";
        }

        // Create Directory: project_root/uploads/{type}/
        String projectRoot = System.getProperty("user.dir");
        String folderPath = projectRoot + File.separator + "uploads" + File.separator + subDir + File.separator;
        File folder = new File(folderPath);
        if (!folder.exists()) {
            folder.mkdirs();
        }

        // Generate unique filename
        String fileName = UUID.randomUUID().toString().replace("-", "") + suffix;

        try {
            // Save file
            File dest = new File(folderPath + fileName);
            file.transferTo(dest);

            // Construct URL: http://host:port/uploads/{type}/{filename}
            String fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/uploads/")
                    .path(subDir + "/")
                    .path(fileName)
                    .toUriString();

            return Result.success(fileUrl);

        } catch (IOException e) {
            e.printStackTrace();
            return Result.error(500, "File upload failed: " + e.getMessage());
        }
    }

    private boolean isAllowed(String suffix, String[] allowed) {
        for (String ext : allowed) {
            if (ext.equals(suffix)) return true;
        }
        return false;
    }
}