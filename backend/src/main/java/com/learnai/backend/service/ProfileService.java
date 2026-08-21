package com.learnai.backend.service;

import com.learnai.backend.dto.ProfileUpdateRequest;
import com.learnai.backend.exception.AppException;
import com.learnai.backend.model.LearnerProfile;
import com.learnai.backend.model.User;
import com.learnai.backend.repository.LearnerProfileRepository;
import com.learnai.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final LearnerProfileRepository profileRepository;

    public ProfileService(UserRepository userRepository, LearnerProfileRepository profileRepository) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
    }

    public LearnerProfile getProfileByUserEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        return profileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new AppException("Profile not found", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public LearnerProfile updateProfileByUserEmail(String email, ProfileUpdateRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        LearnerProfile profile = profileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new AppException("Profile not found", HttpStatus.NOT_FOUND));

        if (request.goal() != null) profile.setGoal(request.goal());
        if (request.level() != null) profile.setLevel(request.level());
        if (request.interests() != null) profile.setInterests(request.interests());
        if (request.timeline() != null) profile.setTimeline(request.timeline());
        if (request.currentSkills() != null) profile.setCurrentSkills(request.currentSkills());
        if (request.onboarded() != null) profile.setOnboarded(request.onboarded());

        return profileRepository.save(profile);
    }
}
