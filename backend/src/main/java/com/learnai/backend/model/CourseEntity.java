package com.learnai.backend.model;

import com.learnai.backend.util.StringListConverter;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * JPA entity for the courses catalog.
 * Uses string-based primary keys ('w01', 'd01', etc.) matching the existing course codes.
 * Tags, skills, and prerequisites stored as comma-delimited TEXT via StringListConverter.
 */
@Entity
@Table(name = "courses")
public class CourseEntity {

    @Id
    @Column(length = 10)
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false, length = 20)
    private String domain;

    @Column(nullable = false, length = 20)
    private String level;

    private String icon;
    private String duration;
    private Double rating;
    private String students;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String url;

    @Column(name = "tags", columnDefinition = "TEXT")
    @Convert(converter = StringListConverter.class)
    private List<String> tags = new ArrayList<>();

    @Column(name = "skills", columnDefinition = "TEXT")
    @Convert(converter = StringListConverter.class)
    private List<String> skills = new ArrayList<>();

    @Column(name = "prerequisites", columnDefinition = "TEXT")
    @Convert(converter = StringListConverter.class)
    private List<String> prerequisites = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String why;

    private boolean verified = true;

    public CourseEntity() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getLevel() {
        return level;
    }

    public void setLevel(String level) {
        this.level = level;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getDuration() {
        return duration;
    }

    public void setDuration(String duration) {
        this.duration = duration;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public String getStudents() {
        return students;
    }

    public void setStudents(String students) {
        this.students = students;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public List<String> getPrerequisites() {
        return prerequisites;
    }

    public void setPrerequisites(List<String> prerequisites) {
        this.prerequisites = prerequisites;
    }

    public String getWhy() {
        return why;
    }

    public void setWhy(String why) {
        this.why = why;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }
}
