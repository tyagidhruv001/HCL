package com.learnai.backend.dto;

public record LoginResponse(String token, UserSummary user) {
    public record UserSummary(Long id, String name, String email, String role) {}
}
