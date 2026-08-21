package com.learnai.backend.service;

import com.learnai.backend.dto.LearnerProfileRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class MlClientService {

    private static final Logger log = LoggerFactory.getLogger(MlClientService.class);
    private final RestClient mlRestClient;

    public MlClientService(RestClient mlRestClient) {
        this.mlRestClient = mlRestClient;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> fetchRecommendationPath(LearnerProfileRequest request) {
        try {
            log.info("Sending recommendation request to ML service for learner: {}", request.name());
            
            return mlRestClient.post()
                    .uri("/api/recommend")
                    .body(request)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("ML Service offline or error occurred: {}. Falling back to default mock path.", e.getMessage());
            
            // Fallback response matching Node.js service logic
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("title", "Personalised path for " + request.name());
            fallback.put("description", "A customised track focused on: " + request.goal());
            fallback.put("totalDuration", request.timeline() != null ? request.timeline() : "3 months");
            fallback.put("phases", Collections.emptyList());
            return fallback;
        }
    }
}
