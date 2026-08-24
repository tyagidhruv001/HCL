package com.learnai.backend.controller;

import com.learnai.backend.dto.ApiResponse;
import com.learnai.backend.dto.ChatMessageDTO;
import com.learnai.backend.dto.ChatSessionDTO;
import com.learnai.backend.dto.SendMessageRequest;
import com.learnai.backend.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/session")
    public ResponseEntity<ApiResponse<ChatSessionDTO>> getOrCreateActiveSession(Authentication authentication) {
        String email = authentication.getName();
        ChatSessionDTO session = chatService.getOrCreateActiveSession(email);
        return ResponseEntity.ok(ApiResponse.success("Active chat session retrieved", session));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageDTO>>> getSessionMessages(
            @PathVariable Long sessionId,
            Authentication authentication) {
        String email = authentication.getName();
        List<ChatMessageDTO> messages = chatService.getSessionMessages(email, sessionId);
        return ResponseEntity.ok(ApiResponse.success("Chat messages retrieved successfully", messages));
    }

    @PostMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<ApiResponse<ChatMessageDTO>> sendMessage(
            @PathVariable Long sessionId,
            @Valid @RequestBody SendMessageRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        ChatMessageDTO response = chatService.sendMessage(email, sessionId, request);
        return ResponseEntity.ok(ApiResponse.success("Message processed successfully", response));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @PathVariable Long sessionId,
            Authentication authentication) {
        String email = authentication.getName();
        chatService.deleteSession(email, sessionId);
        return ResponseEntity.ok(ApiResponse.success("Chat session deleted successfully"));
    }
}
