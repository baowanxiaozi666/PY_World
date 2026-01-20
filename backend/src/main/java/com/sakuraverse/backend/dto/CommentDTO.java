package com.sakuraverse.backend.dto;

import lombok.Data;
import java.io.Serializable;

@Data
public class CommentDTO implements Serializable {
    private String author;
    private String content;
}