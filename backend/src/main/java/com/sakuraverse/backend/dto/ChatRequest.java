package com.sakuraverse.backend.dto;

import lombok.Data;
import java.io.Serializable;
import java.util.List;

@Data
public class ChatRequest implements Serializable {
    private String message;
    private List<MessageItem> history;
}