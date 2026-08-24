package com.learnai.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record StudySessionRequest(
        @NotNull(message = "Duration in minutes is required")
        @Positive(message = "Duration must be a positive integer")
        Integer duration
) {}
