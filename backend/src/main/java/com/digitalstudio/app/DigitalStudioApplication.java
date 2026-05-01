package com.digitalstudio.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import jakarta.annotation.PostConstruct;
import java.util.TimeZone;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class DigitalStudioApplication {

	public static void main(String[] args) {
		SpringApplication.run(DigitalStudioApplication.class, args);
	}

	@PostConstruct
	public void init() {
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
	}

}
