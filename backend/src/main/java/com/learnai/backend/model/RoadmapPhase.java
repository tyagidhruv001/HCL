package com.learnai.backend.model;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "roadmap_phases")
public class RoadmapPhase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    private Roadmap roadmap;

    @Column(nullable = false)
    private Integer phaseNumber;

    @Column(nullable = false)
    private String title;

    private String duration;
    private String theme;

    @Column(columnDefinition = "TEXT")
    private String milestone;

    @ManyToMany
    @JoinTable(
        name = "roadmap_courses",
        joinColumns = @JoinColumn(name = "phase_id"),
        inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    @OrderBy("id ASC")
    private List<CourseEntity> courses = new ArrayList<>();

    public RoadmapPhase() {
    }

    public RoadmapPhase(Roadmap roadmap, Integer phaseNumber, String title) {
        this.roadmap = roadmap;
        this.phaseNumber = phaseNumber;
        this.title = title;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Roadmap getRoadmap() {
        return roadmap;
    }

    public void setRoadmap(Roadmap roadmap) {
        this.roadmap = roadmap;
    }

    public Integer getPhaseNumber() {
        return phaseNumber;
    }

    public void setPhaseNumber(Integer phaseNumber) {
        this.phaseNumber = phaseNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public String getMilestone() {
        return milestone;
    }

    public void setMilestone(String milestone) {
        this.milestone = milestone;
    }

    public List<CourseEntity> getCourses() {
        return courses;
    }

    public void setCourses(List<CourseEntity> courses) {
        this.courses = courses;
    }
}
