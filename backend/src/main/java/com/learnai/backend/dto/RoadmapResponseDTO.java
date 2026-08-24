package com.learnai.backend.dto;

import com.learnai.backend.model.CourseEntity;
import com.learnai.backend.model.Roadmap;
import com.learnai.backend.model.RoadmapPhase;
import com.learnai.backend.model.RoadmapStatus;

import java.time.LocalDateTime;
import java.util.List;

public record RoadmapResponseDTO(
        Long id,
        Long userId,
        String title,
        String description,
        String totalDuration,
        String goal,
        RoadmapStatus status,
        LocalDateTime createdAt,
        List<PhaseDTO> phases
) {
    public record PhaseDTO(
            Long id,
            Integer phaseNumber,
            String title,
            String theme,
            String duration,
            String milestone,
            List<CourseEntity> courses
    ) {
        public static PhaseDTO from(RoadmapPhase phase) {
            return new PhaseDTO(
                    phase.getId(),
                    phase.getPhaseNumber(),
                    phase.getTitle(),
                    phase.getTheme(),
                    phase.getDuration(),
                    phase.getMilestone(),
                    phase.getCourses()
            );
        }
    }

    public static RoadmapResponseDTO from(Roadmap roadmap) {
        List<PhaseDTO> phaseDTOs = roadmap.getPhases() != null
                ? roadmap.getPhases().stream().map(PhaseDTO::from).toList()
                : List.of();

        return new RoadmapResponseDTO(
                roadmap.getId(),
                roadmap.getUser().getId(),
                roadmap.getTitle(),
                roadmap.getDescription(),
                roadmap.getTotalDuration(),
                roadmap.getGoal(),
                roadmap.getStatus(),
                roadmap.getCreatedAt(),
                phaseDTOs
        );
    }
}
