package com.sakuraverse.backend.dto;

import lombok.Data;
import java.io.Serializable;
import java.util.List;

@Data
public class PostDTO implements Serializable {
    private String title;
    private String excerpt;
    private String content;
    private String category;
    private String imageUrl;
    private List<String> tags;
}