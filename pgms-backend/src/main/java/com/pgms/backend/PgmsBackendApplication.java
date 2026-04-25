package com.pgms.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class PgmsBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(PgmsBackendApplication.class, args);
    }
}
    