package com.pgms.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class KycSchemaNormalizer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(KycSchemaNormalizer.class);

    private final JdbcTemplate jdbcTemplate;

    public KycSchemaNormalizer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("ALTER TABLE tenant_profiles MODIFY COLUMN kyc_status VARCHAR(32) NOT NULL");
        } catch (Exception ex) {
            log.debug("Skipping KYC schema normalization: {}", ex.getMessage());
        }
    }
}
