package com.learnai.backend.service;

import com.learnai.backend.dto.AgentActionRequest;
import com.learnai.backend.dto.AgentActionResponseDTO;
import com.learnai.backend.dto.RoadmapResponseDTO;
import com.learnai.backend.exception.AppException;
import com.learnai.backend.model.*;
import com.learnai.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class AgentActionService {

    private static final Logger log = LoggerFactory.getLogger(AgentActionService.class);

    private final RoadmapRepository roadmapRepository;
    private final CourseEntityRepository courseRepository;
    private final UserRepository userRepository;

    public AgentActionService(
            RoadmapRepository roadmapRepository,
            CourseEntityRepository courseRepository,
            UserRepository userRepository) {
        this.roadmapRepository = roadmapRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public AgentActionResponseDTO executeAgentAction(String email, AgentActionRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        // 1. Resolve target roadmap (specific ID or active roadmap)
        Roadmap roadmap;
        if (request.roadmapId() != null) {
            roadmap = roadmapRepository.findById(request.roadmapId())
                    .orElseThrow(() -> new AppException("Roadmap not found", HttpStatus.NOT_FOUND));
        } else {
            roadmap = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), RoadmapStatus.ACTIVE)
                    .orElseThrow(() -> new AppException("No active roadmap found for user", HttpStatus.BAD_REQUEST));
        }

        // 2. Strict Authorization Check: does this roadmap belong to the authenticated user?
        if (!roadmap.getUser().getId().equals(user.getId())) {
            log.warn("Unauthorized attempt to mutate roadmap id={} by user={}", roadmap.getId(), email);
            throw new AppException("Unauthorized access: You do not own this roadmap", HttpStatus.FORBIDDEN);
        }

        // 3. Verify Course existence
        CourseEntity course = courseRepository.findById(request.courseId())
                .orElseThrow(() -> new AppException("Course not found with id: " + request.courseId(), HttpStatus.NOT_FOUND));

        int targetPhaseNum = (request.phaseNumber() != null && request.phaseNumber() > 0) ? request.phaseNumber() : 2;

        // Find matching phase in roadmap
        RoadmapPhase targetPhase = null;
        for (RoadmapPhase phase : roadmap.getPhases()) {
            if (phase.getPhaseNumber().equals(targetPhaseNum)) {
                targetPhase = phase;
                break;
            }
        }

        if (targetPhase == null) {
            if (!roadmap.getPhases().isEmpty()) {
                targetPhase = roadmap.getPhases().get(0);
            } else {
                throw new AppException("No phases found in roadmap", HttpStatus.BAD_REQUEST);
            }
        }

        String action = request.action().trim().toUpperCase();
        String message;

        if ("ADD_COURSE".equals(action)) {
            List<CourseEntity> currentCourses = new ArrayList<>(targetPhase.getCourses());
            boolean alreadyExists = currentCourses.stream().anyMatch(c -> c.getId().equalsIgnoreCase(course.getId()));
            if (!alreadyExists) {
                currentCourses.add(course);
                targetPhase.setCourses(currentCourses);
                message = String.format("Successfully added '%s' to Phase %d.", course.getTitle(), targetPhase.getPhaseNumber());
            } else {
                message = String.format("Course '%s' is already present in Phase %d.", course.getTitle(), targetPhase.getPhaseNumber());
            }
        } else if ("REMOVE_COURSE".equals(action)) {
            List<CourseEntity> currentCourses = new ArrayList<>(targetPhase.getCourses());
            boolean removed = currentCourses.removeIf(c -> c.getId().equalsIgnoreCase(course.getId()));
            if (removed) {
                targetPhase.setCourses(currentCourses);
                message = String.format("Successfully removed '%s' from Phase %d.", course.getTitle(), targetPhase.getPhaseNumber());
            } else {
                message = String.format("Course '%s' was not found in Phase %d.", course.getTitle(), targetPhase.getPhaseNumber());
            }
        } else {
            throw new AppException("Unsupported agent action: " + action, HttpStatus.BAD_REQUEST);
        }

        Roadmap saved = roadmapRepository.save(roadmap);
        log.info("Agent action '{}' on course '{}' executed successfully for user '{}'", action, course.getId(), email);

        return new AgentActionResponseDTO(
                true,
                message,
                action,
                course.getId(),
                RoadmapResponseDTO.from(saved)
        );
    }
}
