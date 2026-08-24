package com.learnai.backend.service;

import com.learnai.backend.dto.*;
import com.learnai.backend.exception.AppException;
import com.learnai.backend.model.ChatMessage;
import com.learnai.backend.model.ChatSession;
import com.learnai.backend.model.User;
import com.learnai.backend.repository.ChatMessageRepository;
import com.learnai.backend.repository.ChatSessionRepository;
import com.learnai.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ChatService {

    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ProfileService profileService;
    private final AiProxyService aiProxyService;

    public ChatService(
            ChatSessionRepository chatSessionRepository,
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            ProfileService profileService,
            AiProxyService aiProxyService) {
        this.chatSessionRepository = chatSessionRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.profileService = profileService;
        this.aiProxyService = aiProxyService;
    }

    @Transactional
    public ChatSessionDTO getOrCreateActiveSession(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        List<ChatSession> sessions = chatSessionRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        if (!sessions.isEmpty()) {
            return ChatSessionDTO.from(sessions.get(0));
        }

        // Create initial default session
        ChatSession newSession = new ChatSession(user);
        newSession.setTitle("Learning Advisor Chat");
        ChatSession saved = chatSessionRepository.save(newSession);

        // Add welcome message
        ProfileResponseDTO profile = profileService.getProfileByUserEmail(email);
        String welcomeText = (profile != null && profile.isOnboarded())
                ? String.format("Hi **%s**! 👋 I'm **LearnAI**, your personalized learning advisor.\n\nI see your goal is: *\"%s\"*. How can I assist you with your learning roadmap today?", profile.getName(), profile.getGoal())
                : "Hi there! 👋 I'm **LearnAI**, your AI-powered learning advisor.\n\nI help you discover the perfect learning path based on your goals, skills, and interests. What's your primary learning goal?";

        ChatMessage welcomeMsg = new ChatMessage(saved, "ai", welcomeText);
        chatMessageRepository.save(welcomeMsg);
        saved.addMessage(welcomeMsg);

        return ChatSessionDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDTO> getSessionMessages(String email, Long sessionId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new AppException("Chat session not found", HttpStatus.NOT_FOUND));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new AppException("Unauthorized access to chat session", HttpStatus.FORBIDDEN);
        }

        return chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(ChatMessageDTO::from)
                .toList();
    }

    @Transactional
    public ChatMessageDTO sendMessage(String email, Long sessionId, SendMessageRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new AppException("Chat session not found", HttpStatus.NOT_FOUND));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new AppException("Unauthorized access to chat session", HttpStatus.FORBIDDEN);
        }

        // 1. Save user message to database
        ChatMessage userMsg = new ChatMessage(session, "user", request.content());
        chatMessageRepository.save(userMsg);
        session.addMessage(userMsg);

        // 2. Fetch history and profile context
        List<ChatMessageDTO> history = chatMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)
                .stream()
                .map(ChatMessageDTO::from)
                .toList();

        ProfileResponseDTO profile = profileService.getProfileByUserEmail(email);

        // 3. Generate response via AI proxy (with user-provided API key or server key)
        String aiResponseText = aiProxyService.generateResponse(request.content(), history, profile, request.apiKey());

        // 4. Save AI message to database
        ChatMessage aiMsg = new ChatMessage(session, "ai", aiResponseText);
        ChatMessage savedAiMsg = chatMessageRepository.save(aiMsg);
        session.addMessage(savedAiMsg);

        return ChatMessageDTO.from(savedAiMsg);
    }

    @Transactional
    public void deleteSession(String email, Long sessionId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        ChatSession session = chatSessionRepository.findById(sessionId)
                .orElseThrow(() -> new AppException("Chat session not found", HttpStatus.NOT_FOUND));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new AppException("Unauthorized access to chat session", HttpStatus.FORBIDDEN);
        }

        chatSessionRepository.delete(session);
    }
}
