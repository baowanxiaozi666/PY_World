package com.sakuraverse.backend.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import java.io.Serializable;
import java.util.Date;

@Data
public class Comment implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long id;
    private String author;
    private String content;

    @JsonFormat(pattern = "yyyy-MM-dd", timezone = "Asia/Shanghai")
    private Date date;
    
    // Used for inserting comment (linking to post)
    private Long postId;
    
    // Used for reply functionality
    private Long parentId; // null for top-level comments, comment_id for replies
    
    // Replies list (not stored in DB, populated when fetching)
    private java.util.List<Comment> replies;
}