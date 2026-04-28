package com.pgms.backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Component
public class AmenitySchemaNormalizer {

    private static final Logger log = LoggerFactory.getLogger(AmenitySchemaNormalizer.class);

    @Bean
    ApplicationRunner normalizeAmenitySchema(JdbcTemplate jdbcTemplate) {
        return args -> {
            ensureColumn(jdbcTemplate, "amenity_configs", "display_name",
                    "alter table amenity_configs add column display_name varchar(255) null");
            ensureColumn(jdbcTemplate, "amenity_configs", "unit_count",
                    "alter table amenity_configs add column unit_count int null");
            ensureColumn(jdbcTemplate, "amenity_slots", "amenity_config_id",
                    "alter table amenity_slots add column amenity_config_id bigint null");
            ensureIndex(jdbcTemplate, "amenity_configs", "idx_amenity_configs_pg_id",
                    "create index idx_amenity_configs_pg_id on amenity_configs (pg_id)");

            jdbcTemplate.execute("""
                    update amenity_configs
                    set display_name = case amenity_type
                        when 'WASHING_MACHINE' then 'Washing Machine'
                        when 'TABLE_TENNIS' then 'Table Tennis'
                        when 'CARROM' then 'Carrom'
                        when 'BADMINTON' then 'Badminton'
                        else 'Custom Amenity'
                    end
                    where display_name is null or trim(display_name) = ''
                    """);
            jdbcTemplate.execute("""
                    update amenity_configs
                    set unit_count = case
                        when unit_count is null and amenity_type = 'WASHING_MACHINE' then greatest(capacity, 1)
                        when unit_count is null then 1
                        else unit_count
                    end
                    where unit_count is null or unit_count < 1
                    """);
            jdbcTemplate.execute("""
                    update amenity_slots s
                    join (
                        select min(id) as id, pg_id, amenity_type
                        from amenity_configs
                        group by pg_id, amenity_type
                    ) c on c.pg_id = s.pg_id and c.amenity_type = s.amenity_type
                    set s.amenity_config_id = c.id
                    where s.amenity_config_id is null
                    """);

            dropLegacyAmenityForeignKeys(jdbcTemplate);
            dropUnusedAmenityConfigUniqueIndexes(jdbcTemplate);
        };
    }

    private void dropLegacyAmenityForeignKeys(JdbcTemplate jdbcTemplate) {
        List<String> constraintNames = jdbcTemplate.queryForList(
                """
                select constraint_name
                from information_schema.key_column_usage
                where table_schema = database()
                  and table_name = 'amenity_slots'
                  and referenced_table_name = 'amenity_configs'
                group by constraint_name
                having sum(case when column_name = 'amenity_config_id' then 1 else 0 end) = 0
                """,
                String.class
        );
        for (String constraintName : constraintNames) {
            try {
                jdbcTemplate.execute("alter table amenity_slots drop foreign key " + constraintName);
            } catch (Exception ex) {
                log.warn("Could not drop legacy amenity foreign key {}: {}", constraintName, ex.getMessage());
            }
        }
    }

    private void dropUnusedAmenityConfigUniqueIndexes(JdbcTemplate jdbcTemplate) {
        List<String> uniqueIndexes = jdbcTemplate.queryForList(
                """
                select distinct index_name
                from information_schema.statistics
                where table_schema = database()
                  and table_name = 'amenity_configs'
                  and non_unique = 0
                  and index_name <> 'PRIMARY'
                """,
                String.class
        );
        for (String indexName : uniqueIndexes) {
            try {
                jdbcTemplate.execute("alter table amenity_configs drop index " + indexName);
            } catch (Exception ex) {
                log.warn("Could not drop amenity_configs index {}: {}", indexName, ex.getMessage());
            }
        }
    }

    private void ensureColumn(JdbcTemplate jdbcTemplate, String tableName, String columnName, String ddl) {
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
        if (count != null && count == 0) {
            jdbcTemplate.execute(ddl);
        }
    }

    private void ensureIndex(JdbcTemplate jdbcTemplate, String tableName, String indexName, String ddl) {
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.statistics
                where table_schema = database()
                  and table_name = ?
                  and index_name = ?
                """,
                Integer.class,
                tableName,
                indexName
        );
        if (count != null && count == 0) {
            jdbcTemplate.execute(ddl);
        }
    }
}
