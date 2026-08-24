package com.learnai.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.learnai.backend.model.CourseEntity;
import com.learnai.backend.repository.CourseEntityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final CourseEntityRepository courseEntityRepository;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    public DataSeeder(
            CourseEntityRepository courseEntityRepository,
            ResourceLoader resourceLoader,
            ObjectMapper objectMapper) {
        this.courseEntityRepository = courseEntityRepository;
        this.resourceLoader = resourceLoader;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) {
        if (courseEntityRepository.count() == 0) {
            log.info("Course repository is empty. Seeding initial course catalog from data/courses.json...");
            try {
                Resource resource = resourceLoader.getResource("classpath:data/courses.json");
                try (InputStream inputStream = resource.getInputStream()) {
                    List<CourseEntity> courses = objectMapper.readValue(
                            inputStream,
                            new TypeReference<List<CourseEntity>>() {}
                    );
                    courseEntityRepository.saveAll(courses);
                    log.info("Successfully seeded {} courses into PostgreSQL.", courses.size());
                }
            } catch (Exception e) {
                log.error("Failed to seed course catalog: {}", e.getMessage(), e);
            }
        } else {
            log.info("Course repository already contains {} courses. Skipping seeding.", courseEntityRepository.count());
        }
    }
}
