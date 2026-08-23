package com.learnai.backend.dto;

import com.learnai.backend.model.LearnerProfile;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for returning profile data to the client.
 * Flattens the User association to avoid Hibernate LazyInitializationException
 * when Jackson tries to serialize the entity after the session is closed.
 */
public class ProfileResponseDTO {

    private Long id;
    private Long userId;
    private String name;
    private String email;
    private String goal;
    private String level;
    private List<String> interests;
    private String timeline;
    private List<String> currentSkills;
    private boolean onboarded;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ProfileResponseDTO() {}

    /** Build from a fully-loaded LearnerProfile entity (user must be eagerly available). */
    public static ProfileResponseDTO from(LearnerProfile profile) {
        ProfileResponseDTO dto = new ProfileResponseDTO();
        dto.id           = profile.getId();
        dto.userId       = profile.getUser().getId();
        dto.name         = profile.getUser().getName();
        dto.email        = profile.getUser().getEmail();
        dto.goal         = profile.getGoal();
        dto.level        = profile.getLevel();
        dto.interests    = profile.getInterests();
        dto.timeline     = profile.getTimeline();
        dto.currentSkills = profile.getCurrentSkills();
        dto.onboarded    = profile.isOnboarded();
        dto.createdAt    = profile.getCreatedAt();
        dto.updatedAt    = profile.getUpdatedAt();
        return dto;
    }

    // Getters
    public Long getId()                    { return id; }
    public Long getUserId()                { return userId; }
    public String getName()                { return name; }
    public String getEmail()               { return email; }
    public String getGoal()                { return goal; }
    public String getLevel()               { return level; }
    public List<String> getInterests()     { return interests; }
    public String getTimeline()            { return timeline; }
    public List<String> getCurrentSkills() { return currentSkills; }
    public boolean isOnboarded()           { return onboarded; }
    public LocalDateTime getCreatedAt()    { return createdAt; }
    public LocalDateTime getUpdatedAt()    { return updatedAt; }
}
