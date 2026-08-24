package com.learnai.backend.service;

import com.learnai.backend.model.CourseEntity;
import com.learnai.backend.repository.CourseEntityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class CourseService {

    private final CourseEntityRepository courseRepository;

    public CourseService(CourseEntityRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @Transactional(readOnly = true)
    public List<CourseEntity> getCourses(String domain, String level, String search) {
        if (search != null && !search.isBlank()) {
            return courseRepository.searchCourses(search.trim());
        }
        if (domain != null && !domain.isBlank() && level != null && !level.isBlank()) {
            return courseRepository.findByDomainIgnoreCaseAndLevelIgnoreCase(domain.trim(), level.trim());
        }
        if (domain != null && !domain.isBlank()) {
            return courseRepository.findByDomainIgnoreCase(domain.trim());
        }
        if (level != null && !level.isBlank()) {
            return courseRepository.findByLevelIgnoreCase(level.trim());
        }
        return courseRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<CourseEntity> getCourse(String id) {
        return courseRepository.findById(id);
    }
}
