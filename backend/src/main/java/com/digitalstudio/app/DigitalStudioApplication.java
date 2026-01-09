package com.digitalstudio.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class DigitalStudioApplication {

	public static void main(String[] args) {
		SpringApplication.run(DigitalStudioApplication.class, args);
	}

}
