package com.learnai.backend.dto;

import java.util.List;

public record ProfileUpdateRequest(
    String goal,
    String level,
    List<String> interests,
    String timeline,
    List<String> currentSkills,
    Boolean onboarded
) {}
