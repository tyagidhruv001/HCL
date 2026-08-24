package com.learnai.backend.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "study_sessions")
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Duration in minutes */
    @Column(nullable = false)
    private Integer duration;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime studiedAt;

    public StudySession() {
    }

    public StudySession(User user, Integer duration) {
        this.user = user;
        this.duration = duration;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public LocalDateTime getStudiedAt() {
        return studiedAt;
    }

    public void setStudiedAt(LocalDateTime studiedAt) {
        this.studiedAt = studiedAt;
    }
}
