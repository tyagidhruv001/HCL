package com.learnai.backend.repository;

import com.learnai.backend.model.CourseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseEntityRepository extends JpaRepository<CourseEntity, String> {
    List<CourseEntity> findByDomainIgnoreCase(String domain);
    List<CourseEntity> findByLevelIgnoreCase(String level);
    List<CourseEntity> findByDomainIgnoreCaseAndLevelIgnoreCase(String domain, String level);

    @Query("SELECT c FROM CourseEntity c WHERE " +
           "LOWER(c.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(c.domain) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<CourseEntity> searchCourses(@Param("query") String query);
}
