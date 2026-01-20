package com.sakuraverse.backend.entity;

import lombok.Data;
import java.io.Serializable;

@Data
public class AboutProfile implements Serializable {
    private static final long serialVersionUID = 1L;

    private Integer id;
    private String displayName;
    private String avatarUrl;
    private String backgroundUrl; // Custom MP4 background
    private String content; // Bio description
    private String interests; // Comma separated string
    private String animeTaste; // Comma separated string
}