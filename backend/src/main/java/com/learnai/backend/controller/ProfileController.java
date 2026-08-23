package com.learnai.backend.controller;

import com.learnai.backend.dto.ApiResponse;
import com.learnai.backend.dto.ProfileResponseDTO;
import com.learnai.backend.dto.ProfileUpdateRequest;
import com.learnai.backend.service.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileResponseDTO>> getProfile(Principal principal) {
        ProfileResponseDTO profile = profileService.getProfileByUserEmail(principal.getName());
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", profile));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ProfileResponseDTO>> updateProfile(
            Principal principal,
            @RequestBody ProfileUpdateRequest request) {

        ProfileResponseDTO profile = profileService.updateProfileByUserEmail(principal.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", profile));
    }
}
