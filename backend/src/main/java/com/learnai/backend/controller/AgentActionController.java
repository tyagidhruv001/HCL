package com.learnai.backend.controller;

import com.learnai.backend.dto.AgentActionRequest;
import com.learnai.backend.dto.AgentActionResponseDTO;
import com.learnai.backend.service.AgentActionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/agent")
public class AgentActionController {

    private final AgentActionService agentActionService;

    public AgentActionController(AgentActionService agentActionService) {
        this.agentActionService = agentActionService;
    }

    @PostMapping("/action")
    public ResponseEntity<AgentActionResponseDTO> executeAction(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AgentActionRequest request) {

        AgentActionResponseDTO response = agentActionService.executeAgentAction(userDetails.getUsername(), request);
        return ResponseEntity.ok(response);
    }
}
