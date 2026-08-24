package com.learnai.backend.controller;

import com.learnai.backend.dto.ApiResponse;
import com.learnai.backend.dto.ProgressResponseDTO;
import com.learnai.backend.dto.ProgressUpdateRequest;
import com.learnai.backend.service.ProgressService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(ProgressService progressService) {
        this.progressService = progressService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProgressResponseDTO>>> getProgress(Authentication authentication) {
        String email = authentication.getName();
        List<ProgressResponseDTO> progressList = progressService.getUserProgress(email);
        return ResponseEntity.ok(ApiResponse.success("Progress retrieved successfully", progressList));
    }

    @PutMapping("/{courseId}")
    public ResponseEntity<ApiResponse<ProgressResponseDTO>> updateProgress(
            @PathVariable String courseId,
            @Valid @RequestBody ProgressUpdateRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        ProgressResponseDTO updated = progressService.updateProgress(email, courseId, request);
        return ResponseEntity.ok(ApiResponse.success("Progress updated successfully", updated));
    }
}
