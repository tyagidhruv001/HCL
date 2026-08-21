package com.learnai.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class AppConfig {

    @Value("${ml.service.url}")
    private String mlServiceUrl;

    @Bean
    public RestClient mlRestClient() {
        return RestClient.builder()
            .baseUrl(mlServiceUrl)
            .defaultHeader("Content-Type", "application/json")
            .build();
    }
}
