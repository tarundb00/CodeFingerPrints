package com.example.codeFingerPrint;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CodeFingerPrintApplication {

	public static void main(String[] args) {
		SpringApplication.run(CodeFingerPrintApplication.class, args);
	}

}
