package com.learnai.backend.controller;

import com.learnai.backend.dto.ApiResponse;
import com.learnai.backend.dto.StudySessionRequest;
import com.learnai.backend.dto.StudySessionResponseDTO;
import com.learnai.backend.service.StudySessionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/study-sessions")
public class StudySessionController {

    private final StudySessionService studySessionService;

    public StudySessionController(StudySessionService studySessionService) {
        this.studySessionService = studySessionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudySessionResponseDTO>>> getSessions(Authentication authentication) {
        String email = authentication.getName();
        List<StudySessionResponseDTO> sessions = studySessionService.getUserSessions(email);
        return ResponseEntity.ok(ApiResponse.success("Study sessions retrieved successfully", sessions));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudySessionResponseDTO>> logSession(
            @Valid @RequestBody StudySessionRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        StudySessionResponseDTO session = studySessionService.logSession(email, request);
        return ResponseEntity.ok(ApiResponse.success("Study session logged successfully", session));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats(Authentication authentication) {
        String email = authentication.getName();
        Map<String, Object> stats = studySessionService.getStats(email);
        return ResponseEntity.ok(ApiResponse.success("Study statistics retrieved successfully", stats));
    }
}
