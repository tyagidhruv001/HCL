package com.learnai.backend.dto;

/**
 * Uniform API response envelope matching the Node.js response.js format:
 * { "status": "success|error", "message": "...", "data": {...} }
 */
public record ApiResponse<T>(String status, String message, T data) {

    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>("success", message, data);
    }

    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>("success", message, null);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>("error", message, null);
    }
}
