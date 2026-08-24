package com.learnai.backend.service;

import com.learnai.backend.dto.StudySessionRequest;
import com.learnai.backend.dto.StudySessionResponseDTO;
import com.learnai.backend.exception.AppException;
import com.learnai.backend.model.StudySession;
import com.learnai.backend.model.User;
import com.learnai.backend.repository.StudySessionRepository;
import com.learnai.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StudySessionService {

    private final StudySessionRepository studySessionRepository;
    private final UserRepository userRepository;

    public StudySessionService(
            StudySessionRepository studySessionRepository,
            UserRepository userRepository) {
        this.studySessionRepository = studySessionRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<StudySessionResponseDTO> getUserSessions(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        return studySessionRepository.findByUserIdOrderByStudiedAtDesc(user.getId())
                .stream()
                .map(s -> new StudySessionResponseDTO(s.getId(), user.getId(), s.getDuration(), s.getStudiedAt()))
                .toList();
    }

    @Transactional
    public StudySessionResponseDTO logSession(String email, StudySessionRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        StudySession session = new StudySession(user, request.duration());
        StudySession saved = studySessionRepository.save(session);

        return new StudySessionResponseDTO(saved.getId(), user.getId(), saved.getDuration(), saved.getStudiedAt());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStats(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        Long totalMinutes = studySessionRepository.getTotalStudyMinutesByUserId(user.getId());
        if (totalMinutes == null) totalMinutes = 0L;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalMinutes", totalMinutes);
        stats.put("totalHours", Math.round((totalMinutes / 60.0) * 10.0) / 10.0);
        return stats;
    }
}
