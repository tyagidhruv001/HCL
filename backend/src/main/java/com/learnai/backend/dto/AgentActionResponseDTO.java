package com.learnai.backend.dto;

public record AgentActionResponseDTO(
    boolean success,
    String message,
    String action,
    String courseId,
    RoadmapResponseDTO updatedRoadmap
) {}
