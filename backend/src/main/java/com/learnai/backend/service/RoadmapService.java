package com.learnai.backend.service;

import com.learnai.backend.dto.RoadmapResponseDTO;
import com.learnai.backend.exception.AppException;
import com.learnai.backend.model.*;
import com.learnai.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class RoadmapService {

    private static final Logger log = LoggerFactory.getLogger(RoadmapService.class);

    private final RoadmapRepository roadmapRepository;
    private final UserRepository userRepository;
    private final LearnerProfileRepository profileRepository;
    private final CourseEntityRepository courseRepository;
    private final ProgressRepository progressRepository;

    public RoadmapService(
            RoadmapRepository roadmapRepository,
            UserRepository userRepository,
            LearnerProfileRepository profileRepository,
            CourseEntityRepository courseRepository,
            ProgressRepository progressRepository) {
        this.roadmapRepository = roadmapRepository;
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.courseRepository = courseRepository;
        this.progressRepository = progressRepository;
    }

    @Transactional(readOnly = true)
    public List<RoadmapResponseDTO> getUserRoadmaps(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        return roadmapRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(RoadmapResponseDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoadmapResponseDTO getActiveRoadmap(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        return roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), RoadmapStatus.ACTIVE)
                .map(RoadmapResponseDTO::from)
                .orElse(null);
    }

    @Transactional
    public RoadmapResponseDTO generateRoadmap(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        LearnerProfile profile = profileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new AppException("Learner profile not found. Please complete onboarding first.", HttpStatus.BAD_REQUEST));

        // Archive previous active roadmaps
        List<Roadmap> existingRoadmaps = roadmapRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        for (Roadmap r : existingRoadmaps) {
            if (r.getStatus() == RoadmapStatus.ACTIVE) {
                r.setStatus(RoadmapStatus.ARCHIVED);
                roadmapRepository.save(r);
            }
        }

        // Get completed course IDs (progress >= 100)
        Set<String> completedIds = new HashSet<>();
        List<Progress> progressList = progressRepository.findByUserIdAndProgressPercentageGreaterThanEqual(user.getId(), 100);
        for (Progress p : progressList) {
            completedIds.add(p.getCourse().getId());
        }

        List<CourseEntity> allCourses = courseRepository.findAll();

        // Deterministic scoring algorithm
        Map<String, Integer> levelRank = Map.of("beginner", 0, "intermediate", 1, "advanced", 2);
        int learnerLevelRank = levelRank.getOrDefault(profile.getLevel() != null ? profile.getLevel().toLowerCase() : "beginner", 0);
        List<String> interests = profile.getInterests() != null ? profile.getInterests() : List.of();

        List<ScoredCourse> scored = new ArrayList<>();
        for (CourseEntity course : allCourses) {
            if (completedIds.contains(course.getId())) continue;

            int score = 0;
            // Domain match
            if (interests.stream().anyMatch(i -> i.equalsIgnoreCase(course.getDomain()))) {
                score += 30;
            }

            // Level match
            int courseLevelRank = levelRank.getOrDefault(course.getLevel().toLowerCase(), 0);
            if (courseLevelRank == learnerLevelRank) score += 20;
            else if (courseLevelRank == learnerLevelRank + 1) score += 10;
            else if (courseLevelRank > learnerLevelRank + 1) score -= 20;

            // Prerequisite match
            List<String> prereqs = course.getPrerequisites();
            if (prereqs == null || prereqs.isEmpty()) {
                score += 5;
            } else if (completedIds.containsAll(prereqs)) {
                score += 15;
            } else {
                score -= 10;
            }

            scored.add(new ScoredCourse(course, score));
        }

        scored.sort((a, b) -> Integer.compare(b.score, a.score));

        // Segregate by level
        List<CourseEntity> beginners = new ArrayList<>();
        List<CourseEntity> intermediates = new ArrayList<>();
        List<CourseEntity> advanceds = new ArrayList<>();

        for (ScoredCourse sc : scored) {
            String lvl = sc.course.getLevel().toLowerCase();
            if ("beginner".equals(lvl) && beginners.size() < 4) {
                beginners.add(sc.course);
            } else if ("intermediate".equals(lvl) && intermediates.size() < 5) {
                intermediates.add(sc.course);
            } else if ("advanced".equals(lvl) && advanceds.size() < 4) {
                advanceds.add(sc.course);
            }
        }

        // Build Roadmap Entity
        String goal = profile.getGoal() != null ? profile.getGoal() : "Personalized Learning Track";
        Roadmap roadmap = new Roadmap(user, goal);
        roadmap.setTitle("Your " + (goal.length() > 50 ? goal.substring(0, 50) + "..." : goal) + " Roadmap");
        roadmap.setDescription("A structured " + (profile.getLevel() != null ? profile.getLevel() : "Beginner") + "-level path tailored for your goals in " + String.join(", ", interests));
        roadmap.setTotalDuration(profile.getTimeline() != null ? profile.getTimeline() : "3 months");
        roadmap.setStatus(RoadmapStatus.ACTIVE);

        // Phase 1: Foundation
        if (!beginners.isEmpty()) {
            RoadmapPhase phase1 = new RoadmapPhase(roadmap, 1, "Foundation & Core Principles");
            phase1.setTheme("Build fundamental competencies and core terminology in your target domains");
            phase1.setDuration("4 weeks");
            phase1.setMilestone("Understand foundational workflows and build your first structured exercises");
            phase1.setCourses(new ArrayList<>(beginners));
            roadmap.addPhase(phase1);
        }

        // Phase 2: Practical Application
        if (!intermediates.isEmpty()) {
            RoadmapPhase phase2 = new RoadmapPhase(roadmap, 2, "Core Skills & Practical Implementation");
            phase2.setTheme("Apply knowledge directly in hands-on frameworks, libraries, and real-world tools");
            phase2.setDuration("6 weeks");
            phase2.setMilestone("Create complete standalone projects and demonstrate intermediate technical proficiency");
            phase2.setCourses(new ArrayList<>(intermediates));
            roadmap.addPhase(phase2);
        }

        // Phase 3: Advanced Mastery
        if (!advanceds.isEmpty()) {
            RoadmapPhase phase3 = new RoadmapPhase(roadmap, 3, "Advanced Topics & Portfolio Capstone");
            phase3.setTheme("Master enterprise-grade patterns, production deployment, and capstone specialization");
            phase3.setDuration("6 weeks");
            phase3.setMilestone("Complete a production-ready capstone project and prepare for technical interviews");
            phase3.setCourses(new ArrayList<>(advanceds));
            roadmap.addPhase(phase3);
        }

        Roadmap saved = roadmapRepository.save(roadmap);
        log.info("Generated roadmap id={} with {} phases for user={}", saved.getId(), saved.getPhases().size(), email);

        return RoadmapResponseDTO.from(saved);
    }

    private record ScoredCourse(CourseEntity course, int score) {}
}
