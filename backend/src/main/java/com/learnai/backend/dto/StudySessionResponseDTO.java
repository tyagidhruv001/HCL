package com.learnai.backend.dto;

import java.time.LocalDateTime;

public record StudySessionResponseDTO(
        Long id,
        Long userId,
        Integer duration,
        LocalDateTime studiedAt
) {}
