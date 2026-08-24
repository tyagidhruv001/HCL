package com.learnai.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.learnai.backend.dto.ChatMessageDTO;
import com.learnai.backend.dto.ProfileResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;

@Service
public class AiProxyService {

    private static final Logger log = LoggerFactory.getLogger(AiProxyService.class);

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    @Value("${gemini.api.key:}")
    private String defaultApiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String geminiModel;

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

    private static final String TUTOR_SYSTEM = """
            You are LearnAI, an expert personalized learning advisor and AI tutor.
            You help learners discover their ideal learning path based on their goals, skills, and interests.
            Your tone is warm, encouraging, and knowledgeable — like a brilliant mentor.

            Key behaviors:
            - Ask clarifying questions to understand the learner's goals and background
            - Be concise but thorough (3-5 sentences per response normally)
            - When recommending resources, always explain WHY they are suitable for THIS specific learner
            - Acknowledge when the learner already knows something and skip ahead
            - Encourage and celebrate progress
            - If the learner seems stuck or demotivated, offer alternative approaches
            - Adapt difficulty based on signals from the conversation
            - NEVER fabricate course names, always refer to standard domains (Web Dev, Data Science, AI/ML, Cloud & DevOps, Cybersecurity, UI/UX Design).
            """;

    public AiProxyService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public String generateResponse(
            String userMessage,
            List<ChatMessageDTO> conversationHistory,
            ProfileResponseDTO profile,
            String clientApiKey) {

        String keyToUse = (clientApiKey != null && !clientApiKey.isBlank()) ? clientApiKey.trim() : defaultApiKey;

        if (keyToUse == null || keyToUse.isBlank()) {
            log.info("No Gemini API key provided. Falling back to intelligent demo mode response.");
            return generateDemoResponse(userMessage, profile);
        }

        try {
            return callGeminiApi(userMessage, conversationHistory, profile, keyToUse);
        } catch (Exception e) {
            log.error("Failed to get response from Gemini API: {}. Returning friendly fallback.", e.getMessage());
            return "I apologize, but I encountered a temporary issue connecting to the AI service: " + e.getMessage() + ". Please check your API key or try again shortly.";
        }
    }

    private String callGeminiApi(
            String userMessage,
            List<ChatMessageDTO> history,
            ProfileResponseDTO profile,
            String apiKey) throws Exception {

        String url = String.format("%s/%s:generateContent?key=%s", GEMINI_BASE_URL, geminiModel, apiKey);

        // Build prompt context
        StringBuilder promptBuilder = new StringBuilder();
        if (profile != null && profile.isOnboarded()) {
            promptBuilder.append("Current Learner Profile:\n")
                    .append("- Name: ").append(profile.getName() != null ? profile.getName() : "Learner").append("\n")
                    .append("- Goal: ").append(profile.getGoal() != null ? profile.getGoal() : "Not specified").append("\n")
                    .append("- Level: ").append(profile.getLevel() != null ? profile.getLevel() : "Beginner").append("\n")
                    .append("- Interests: ").append(profile.getInterests() != null ? String.join(", ", profile.getInterests()) : "General").append("\n")
                    .append("- Timeline: ").append(profile.getTimeline() != null ? profile.getTimeline() : "3 months").append("\n\n");
        }

        promptBuilder.append("Recent conversation history:\n");
        if (history != null && !history.isEmpty()) {
            int startIdx = Math.max(0, history.size() - 8);
            for (int i = startIdx; i < history.size(); i++) {
                ChatMessageDTO msg = history.get(i);
                String sender = "user".equalsIgnoreCase(msg.role()) ? "Learner" : "LearnAI";
                promptBuilder.append(sender).append(": ").append(msg.content()).append("\n");
            }
        }

        promptBuilder.append("\nLearner: ").append(userMessage).append("\nLearnAI:");

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(
                Map.of("role", "user", "parts", List.of(Map.of("text", promptBuilder.toString())))
        ));
        requestBody.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", TUTOR_SYSTEM))
        ));
        requestBody.put("generationConfig", Map.of(
                "temperature", 0.7,
                "topP", 0.95,
                "maxOutputTokens", 2048
        ));

        String jsonPayload = objectMapper.writeValueAsString(requestBody);

        String rawResponse = restClient.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(jsonPayload)
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(rawResponse);
        JsonNode candidate = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");

        if (candidate.isMissingNode() || candidate.asText().isBlank()) {
            throw new RuntimeException("Empty response received from Gemini API");
        }

        return candidate.asText().trim();
    }

    private String generateDemoResponse(String userMessage, ProfileResponseDTO profile) {
        String lower = userMessage.toLowerCase();
        String name = (profile != null && profile.getName() != null) ? profile.getName() : "there";
        String goal = (profile != null && profile.getGoal() != null) ? profile.getGoal() : "your learning goals";

        if (lower.contains("roadmap") || lower.contains("path") || lower.contains("plan")) {
            return String.format("Hi %s! 👋 I've designed your personalized roadmap based on your goal (*\"%s\"*). You can navigate to **My Path** in the sidebar to view your 3-phase progression.", name, goal);
        }
        if (lower.contains("progress") || lower.contains("how much")) {
            return "You're doing great! Keep following your active roadmap milestones and marking courses complete in the **Dashboard** to track your learning streak.";
        }
        if (lower.contains("hello") || lower.contains("hi") || lower.contains("hey")) {
            return String.format("Hello %s! 👋 How can I help you make progress toward *\"%s\"* today?", name, goal);
        }

        return String.format("Great question! Focusing on consistent practice is key to reaching *\"%s\"*. Would you like me to recommend specific foundational topics, or shall we review your current roadmap milestones?", goal);
    }
}
