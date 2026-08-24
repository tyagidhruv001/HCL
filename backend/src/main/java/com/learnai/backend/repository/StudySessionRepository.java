package com.learnai.backend.repository;

import com.learnai.backend.model.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {
    List<StudySession> findByUserIdOrderByStudiedAtDesc(Long userId);

    @Query("SELECT SUM(s.duration) FROM StudySession s WHERE s.user.id = :userId")
    Long getTotalStudyMinutesByUserId(@Param("userId") Long userId);

    @Query("SELECT s FROM StudySession s WHERE s.user.id = :userId AND s.studiedAt >= :since ORDER BY s.studiedAt ASC")
    List<StudySession> findRecentSessionsByUserId(@Param("userId") Long userId, @Param("since") LocalDateTime since);
}
