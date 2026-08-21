package com.learnai.backend.model;

public record Course(
    String id,
    String title,
    String provider,
    String domain,
    String level,
    String duration
) {}
