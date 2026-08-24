package com.learnai.backend.service;

import com.learnai.backend.dto.ProgressResponseDTO;
import com.learnai.backend.dto.ProgressUpdateRequest;
import com.learnai.backend.exception.AppException;
import com.learnai.backend.model.CourseEntity;
import com.learnai.backend.model.Progress;
import com.learnai.backend.model.User;
import com.learnai.backend.repository.CourseEntityRepository;
import com.learnai.backend.repository.ProgressRepository;
import com.learnai.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ProgressService {

    private final ProgressRepository progressRepository;
    private final UserRepository userRepository;
    private final CourseEntityRepository courseRepository;

    public ProgressService(
            ProgressRepository progressRepository,
            UserRepository userRepository,
            CourseEntityRepository courseRepository) {
        this.progressRepository = progressRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
    }

    @Transactional(readOnly = true)
    public List<ProgressResponseDTO> getUserProgress(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        return progressRepository.findByUserId(user.getId())
                .stream()
                .map(ProgressResponseDTO::from)
                .toList();
    }

    @Transactional
    public ProgressResponseDTO updateProgress(String email, String courseId, ProgressUpdateRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found", HttpStatus.NOT_FOUND));

        CourseEntity course = courseRepository.findById(courseId)
                .orElseThrow(() -> new AppException("Course not found", HttpStatus.NOT_FOUND));

        Progress progress = progressRepository.findByUserIdAndCourseId(user.getId(), courseId)
                .orElseGet(() -> new Progress(user, course));

        progress.setProgressPercentage(request.progressPercentage());
        Progress saved = progressRepository.save(progress);

        return ProgressResponseDTO.from(saved);
    }
}
