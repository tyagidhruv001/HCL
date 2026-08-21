package com.learnai.backend.service;

import com.learnai.backend.model.Course;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
public class CourseService {

    private static final List<Course> MOCK_COURSES = Arrays.asList(
            new Course("w01", "HTML & CSS Fundamentals", "freeCodeCamp", "web", "beginner", "20h"),
            new Course("w02", "JavaScript Essentials", "Codecademy", "web", "beginner", "25h"),
            new Course("d01", "Python for Data Science", "Kaggle", "data", "beginner", "14h")
    );

    public List<Course> getCourses() {
        return MOCK_COURSES;
    }

    public Optional<Course> getCourse(String id) {
        return MOCK_COURSES.stream()
                .filter(course -> course.id().equals(id))
                .findFirst();
    }
}
