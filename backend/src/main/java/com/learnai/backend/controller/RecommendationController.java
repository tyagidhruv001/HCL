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

    @PostMapping("/quiz")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSkillQuiz(
            @RequestBody Map<String, Object> request) {
        String topic = (String) request.getOrDefault("topic", "python");
        String difficulty = (String) request.getOrDefault("difficulty", "beginner");
        Integer numQuestions = (Integer) request.getOrDefault("num_questions", 3);

        Map<String, Object> quiz = recommendationService.getSkillQuiz(topic, difficulty, numQuestions);
        return ResponseEntity.ok(ApiResponse.success("Assessment quiz generated successfully", quiz));
    }

    @org.springframework.web.bind.annotation.GetMapping("/skills-graph")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSkillsGraph(
            @org.springframework.web.bind.annotation.RequestParam(required = false, defaultValue = "all") String domain) {
        Map<String, Object> graph = recommendationService.getSkillGraph(domain);
        return ResponseEntity.ok(ApiResponse.success("Knowledge graph retrieved successfully", graph));
    }
}

