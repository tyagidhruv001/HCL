package com.learnai.backend.repository;

import com.learnai.backend.model.Roadmap;
import com.learnai.backend.model.RoadmapStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoadmapRepository extends JpaRepository<Roadmap, Long> {

    @EntityGraph(attributePaths = {"phases", "phases.courses"})
    List<Roadmap> findByUserIdOrderByCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"phases", "phases.courses"})
    Optional<Roadmap> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, RoadmapStatus status);
}

