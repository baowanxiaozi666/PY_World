package com.sakuraverse.backend.service;

import com.sakuraverse.backend.dto.MessageItem;
import java.util.List;

public interface AIService {
    String chat(String message, List<MessageItem> history);
}