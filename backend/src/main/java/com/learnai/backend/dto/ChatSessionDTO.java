package com.learnai.backend.dto;

import com.learnai.backend.model.ChatSession;

import java.time.LocalDateTime;
import java.util.List;

public record ChatSessionDTO(
        Long id,
        Long userId,
        String title,
        LocalDateTime createdAt,
        List<ChatMessageDTO> messages
) {
    public static ChatSessionDTO from(ChatSession session) {
        List<ChatMessageDTO> messageDTOs = session.getMessages() != null
                ? session.getMessages().stream().map(ChatMessageDTO::from).toList()
                : List.of();

        return new ChatSessionDTO(
                session.getId(),
                session.getUser().getId(),
                session.getTitle(),
                session.getCreatedAt(),
                messageDTOs
        );
    }
}
