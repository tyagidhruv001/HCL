package com.learnai.backend.controller;

import com.learnai.backend.dto.ApiResponse;
import com.learnai.backend.dto.LearnerProfileRequest;
import com.learnai.backend.service.RecommendationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/recommendation")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @PostMapping("/path")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRecommendationPath(
            Principal principal,
            @Valid @RequestBody LearnerProfileRequest request) {
        
        Map<String, Object> path = recommendationService.generateAndSaveRecommendation(principal.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Learning path generated successfully", path));
    }
}
