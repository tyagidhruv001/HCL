package com.learnai.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotBlank(message = "Message content cannot be blank")
        @Size(max = 4000, message = "Message exceeds maximum allowed length of 4000 characters")
        String content,

        // Optional BYOK (Bring Your Own Key) header or body support
        String apiKey
) {}
