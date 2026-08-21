package com.learnai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record LearnerProfileRequest(
    @NotBlank(message = "Name is required") String name,
    @NotBlank(message = "Goal is required") String goal,
    String level,
    List<String> interests,
    String timeline
) {}
