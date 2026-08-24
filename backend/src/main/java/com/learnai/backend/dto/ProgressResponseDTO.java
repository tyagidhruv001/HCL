package com.learnai.backend.dto;

import com.learnai.backend.model.Progress;

import java.time.LocalDateTime;

public record ProgressResponseDTO(
        Long id,
        Long userId,
        String courseId,
        String courseTitle,
        String courseDomain,
        String courseLevel,
        Integer progressPercentage,
        LocalDateTime updatedAt
) {
    public static ProgressResponseDTO from(Progress progress) {
        return new ProgressResponseDTO(
                progress.getId(),
                progress.getUser().getId(),
                progress.getCourse().getId(),
                progress.getCourse().getTitle(),
                progress.getCourse().getDomain(),
                progress.getCourse().getLevel(),
                progress.getProgressPercentage(),
                progress.getUpdatedAt()
        );
    }
}
