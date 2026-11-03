package com.example.codeFingerPrint.services;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
public class EmailService {

  private final JavaMailSender mailSender;

  public EmailService(JavaMailSender mailSender) {
    this.mailSender = mailSender;
  }

  public void send(String to, String subject, String body) {
    try {
      SimpleMailMessage msg = new SimpleMailMessage();
      msg.setTo(to);
      msg.setSubject(subject);
      msg.setText(body);
      mailSender.send(msg);
    } catch (Exception e) {
      System.err.println("Email failed to " + to + ": " + e.getMessage());
    }
  }

  public void sendTest(String senderEmail, String appPassword, String recipient) {
    JavaMailSenderImpl testSender = new JavaMailSenderImpl();
    testSender.setHost("smtp.gmail.com");
    testSender.setPort(587);
    testSender.setUsername(senderEmail);
    testSender.setPassword(appPassword);
    Properties properties = testSender.getJavaMailProperties();
    properties.put("mail.transport.protocol", "smtp");
    properties.put("mail.smtp.auth", "true");
    properties.put("mail.smtp.starttls.enable", "true");
    properties.put("mail.smtp.connectiontimeout", "10000");
    properties.put("mail.smtp.timeout", "10000");
    properties.put("mail.smtp.writetimeout", "10000");

    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(senderEmail);
    message.setTo(recipient);
    message.setSubject("CodeFingerprints email test");
    message.setText("Email delivery is configured successfully.");
    testSender.send(message);
  }
}
