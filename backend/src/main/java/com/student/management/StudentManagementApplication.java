package com.student.management;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class StudentManagementApplication {

	public static void main(String[] args) {
		// Prevent OS-level environment variables (e.g. ambient SERVER_PORT=8081) from overriding designated port 8085
		if (System.getProperty("server.port") == null) {
			String configuredPort = System.getenv("PORT") != null ? System.getenv("PORT") : "8085";
			System.setProperty("server.port", configuredPort);
		}
		SpringApplication.run(StudentManagementApplication.class, args);
	}

}
