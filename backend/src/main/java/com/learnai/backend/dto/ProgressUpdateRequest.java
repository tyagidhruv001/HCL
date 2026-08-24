package com.learnai.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProgressUpdateRequest(
        @NotNull(message = "Progress percentage is required")
        @Min(value = 0, message = "Progress cannot be less than 0")
        @Max(value = 100, message = "Progress cannot exceed 100")
        Integer progressPercentage
) {}
