package com.learnai.backend.repository;

import com.learnai.backend.model.Progress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProgressRepository extends JpaRepository<Progress, Long> {
    List<Progress> findByUserId(Long userId);
    Optional<Progress> findByUserIdAndCourseId(Long userId, String courseId);
    List<Progress> findByUserIdAndProgressPercentageGreaterThanEqual(Long userId, Integer percentage);
}
