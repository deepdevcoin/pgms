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
public class ManagerSchemaNormalizer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ManagerSchemaNormalizer.class);

    private final JdbcTemplate jdbcTemplate;

    public ManagerSchemaNormalizer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (columnExists("manager_profiles", "designation")) {
            try {
                jdbcTemplate.execute("alter table manager_profiles drop column designation");
            } catch (Exception ex) {
                log.warn("Could not drop legacy manager designation column: {}", ex.getMessage());
            }
        }
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.columns
                where table_schema = database()
                  and table_name = ?
                  and column_name = ?
                """,
                Integer.class,
                tableName,
                columnName
        );
        return count != null && count > 0;
    }
}
