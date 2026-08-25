package com.learnai.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record AgentActionRequest(
    @NotBlank String action,
    Long roadmapId,
    Integer phaseNumber,
    @NotBlank String courseId,
    String reason
) {}
