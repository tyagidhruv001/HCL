package com.learnai.backend.service;

import com.learnai.backend.dto.LoginResponse;
import com.learnai.backend.dto.RegisterRequest;
import com.learnai.backend.exception.AppException;
import com.learnai.backend.model.LearnerProfile;
import com.learnai.backend.model.User;
import com.learnai.backend.repository.LearnerProfileRepository;
import com.learnai.backend.repository.UserRepository;
import com.learnai.backend.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final LearnerProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserRepository userRepository,
            LearnerProfileRepository profileRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    public LoginResponse login(String email, String password) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        String token = jwtUtil.generateToken(user.getEmail());
        
        LoginResponse.UserSummary summary = new LoginResponse.UserSummary(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole()
        );

        return new LoginResponse(token, summary);
    }

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new AppException("Email is already registered", HttpStatus.BAD_REQUEST);
        }

        User user = new User(
                request.name(),
                request.email(),
                passwordEncoder.encode(request.password())
        );

        User savedUser = userRepository.save(user);

        // Auto-initialize learner profile
        LearnerProfile profile = new LearnerProfile(savedUser);
        profileRepository.save(profile);

        return savedUser;
    }
}
