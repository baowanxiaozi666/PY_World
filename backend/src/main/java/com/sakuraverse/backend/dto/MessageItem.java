package com.sakuraverse.backend.dto;

import lombok.Data;
import java.io.Serializable;

@Data
public class MessageItem implements Serializable {
    private String role; // 'user' or 'model' (from frontend)
    private String content;
}