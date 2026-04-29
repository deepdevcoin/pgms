package com.pgms.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class NoticeSchemaNormalizer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(NoticeSchemaNormalizer.class);

    private final JdbcTemplate jdbcTemplate;

    public NoticeSchemaNormalizer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("alter table notices modify column content longtext not null");
        } catch (Exception ex) {
            log.warn("Could not normalize notice content column: {}", ex.getMessage());
        }
    }
}
