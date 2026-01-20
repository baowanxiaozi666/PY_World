package com.sakuraverse.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import java.io.Serializable;
import java.util.Date;
import java.util.List;

@Data
public class BlogPost implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String title;
    private String excerpt;
    private String content;
    
    // Changed from coverImage to match Frontend 'imageUrl'
    private String imageUrl; 
    
    private Integer likes;
    
    private Integer views;

    // Changed from createTime to match Frontend 'date' and format as string
    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "Asia/Shanghai")
    private Date date;
    
    // Changed from categoryName to match Frontend 'category'
    private String category; 
    
    private List<String> tags;
    private List<Comment> comments;
    
    // Optimistic Locking Version
    private Integer version;
}