package com.learnai.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.learnai.backend.dto.LearnerProfileRequest;
import com.learnai.backend.exception.AppException;
import com.learnai.backend.model.LearnerProfile;
import com.learnai.backend.model.Recommendation;
import com.learnai.backend.model.User;
import com.learnai.backend.repository.LearnerProfileRepository;
import com.learnai.backend.repository.RecommendationRepository;
import com.learnai.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class RecommendationService {

    private final UserRepository userRepository;
    private final LearnerProfileRepository profileRepository;
    private final RecommendationRepository recommendationRepository;
    private final MlClientService mlClientService;
    private final ObjectMapper objectMapper;

    public RecommendationService(
            UserRepository userRepository,
            LearnerProfileRepository profileRepository,
            RecommendationRepository recommendationRepository,
            MlClientService mlClientService,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.recommendationRepository = recommendationRepository;
        this.mlClientService = mlClientService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Object> generateAndSaveRecommendation(String email, LearnerProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        // Ensure profile exists, otherwise initialize it
        LearnerProfile profile = profileRepository.findByUserId(user.getId())
                .orElseGet(() -> profileRepository.save(new LearnerProfile(user)));

        // Synchronize profile details from incoming request if not set
        boolean profileUpdated = false;
        if (profile.getGoal() == null || profile.getGoal().isBlank()) {
            profile.setGoal(request.goal());
            profileUpdated = true;
        }
        if (profile.getLevel() == null || profile.getLevel().isBlank()) {
            profile.setLevel(request.level());
            profileUpdated = true;
        }
        if (request.interests() != null && !request.interests().isEmpty() && 
            (profile.getInterests() == null || profile.getInterests().isEmpty())) {
            profile.setInterests(request.interests());
            profileUpdated = true;
        }
        if (profile.getTimeline() == null || profile.getTimeline().isBlank()) {
            profile.setTimeline(request.timeline() != null ? request.timeline() : "3 months");
            profileUpdated = true;
        }
        if (profileUpdated) {
            profileRepository.save(profile);
        }

        // Call ML microservice
        Map<String, Object> pathData = mlClientService.fetchRecommendationPath(request);

        // Persist to PostgreSQL database
        try {
            String title = (String) pathData.getOrDefault("title", "AI Learning Path");
            String description = (String) pathData.getOrDefault("description", "");
            String duration = (String) pathData.getOrDefault("totalDuration", "3 months");
            String phasesJson = objectMapper.writeValueAsString(pathData.getOrDefault("phases", "[]"));

            Recommendation recommendation = new Recommendation(user, title, description, duration, phasesJson);
            recommendationRepository.save(recommendation);

        } catch (JsonProcessingException e) {
            throw new AppException("Failed to serialize learning path phases data", HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return pathData;
    }
}
