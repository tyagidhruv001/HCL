package com.learnai.backend.controller;

import com.learnai.backend.dto.ApiResponse;
import com.learnai.backend.model.CourseEntity;
import com.learnai.backend.service.CourseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseEntity>>> getAllCourses(
            @RequestParam(required = false) String domain,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String search) {
        List<CourseEntity> courses = courseService.getCourses(domain, level, search);
        return ResponseEntity.ok(ApiResponse.success("Courses retrieved successfully", courses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseEntity>> getCourseById(@PathVariable String id) {
        return courseService.getCourse(id)
                .map(course -> ResponseEntity.ok(ApiResponse.success("Course retrieved successfully", course)))
                .orElseGet(() -> ResponseEntity.status(404)
                        .body(ApiResponse.error("Course not found")));
    }
}
