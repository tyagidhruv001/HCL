package com.learnai.backend.repository;

import com.learnai.backend.model.RoadmapPhase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoadmapPhaseRepository extends JpaRepository<RoadmapPhase, Long> {
    List<RoadmapPhase> findByRoadmapIdOrderByPhaseNumberAsc(Long roadmapId);
}
