package com.learnai.backend.controller;

import com.learnai.backend.dto.ApiResponse;
import com.learnai.backend.dto.RoadmapResponseDTO;
import com.learnai.backend.service.RoadmapService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roadmaps")
public class RoadmapController {

    private final RoadmapService roadmapService;

    public RoadmapController(RoadmapService roadmapService) {
        this.roadmapService = roadmapService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoadmapResponseDTO>>> getUserRoadmaps(Authentication authentication) {
        String email = authentication.getName();
        List<RoadmapResponseDTO> roadmaps = roadmapService.getUserRoadmaps(email);
        return ResponseEntity.ok(ApiResponse.success("Roadmaps retrieved successfully", roadmaps));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<RoadmapResponseDTO>> getActiveRoadmap(Authentication authentication) {
        String email = authentication.getName();
        RoadmapResponseDTO roadmap = roadmapService.getActiveRoadmap(email);
        return ResponseEntity.ok(ApiResponse.success("Active roadmap retrieved successfully", roadmap));
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<RoadmapResponseDTO>> generateRoadmap(Authentication authentication) {
        String email = authentication.getName();
        RoadmapResponseDTO roadmap = roadmapService.generateRoadmap(email);
        return ResponseEntity.ok(ApiResponse.success("Roadmap generated successfully", roadmap));
    }
}
