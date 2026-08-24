package com.learnai.backend.dto;

import com.learnai.backend.model.ChatMessage;

import java.time.LocalDateTime;

public record ChatMessageDTO(
        Long id,
        Long sessionId,
        String role,
        String content,
        LocalDateTime createdAt
) {
    public static ChatMessageDTO from(ChatMessage message) {
        return new ChatMessageDTO(
                message.getId(),
                message.getSession().getId(),
                message.getRole(),
                message.getContent(),
                message.getCreatedAt()
        );
    }
}
