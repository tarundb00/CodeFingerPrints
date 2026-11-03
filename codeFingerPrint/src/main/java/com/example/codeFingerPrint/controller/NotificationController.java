package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.Notification;
import com.example.codeFingerPrint.repository.NotificationRepository;
import com.example.codeFingerPrint.services.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

  private final NotificationRepository repository;
  private final EmailService emailService;

  public NotificationController(NotificationRepository repository, EmailService emailService) {
    this.repository = repository;
    this.emailService = emailService;
  }

  @GetMapping("/{recipientKey}")
  public List<Notification> getNotifications(@PathVariable String recipientKey) {
    return repository.findTop50ByRecipientKeyOrderByCreatedAtDesc(recipientKey);
  }

  @PutMapping("/{id}/read")
  public ResponseEntity<?> markRead(@PathVariable Long id) {
    return repository.findById(id).map(notification -> {
      notification.setRead(true);
      return ResponseEntity.ok(repository.save(notification));
    }).orElse(ResponseEntity.notFound().build());
  }

  @PutMapping("/{recipientKey}/read-all")
  public ResponseEntity<?> markAllRead(@PathVariable String recipientKey) {
    List<Notification> notifications = repository.findByReadFalseAndRecipientKey(recipientKey);
    notifications.forEach(notification -> notification.setRead(true));
    repository.saveAll(notifications);
    return ResponseEntity.ok().build();
  }

  @PostMapping("/test")
  public ResponseEntity<?> sendTestEmail(@RequestBody Map<String, String> request, Authentication authentication) {
    boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
        .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    if (!isAdmin) {
      return ResponseEntity.status(403).body(Map.of("message", "Only an admin can test email delivery"));
    }
    String senderEmail = request.getOrDefault("senderEmail", "").trim();
    String appPassword = request.getOrDefault("appPassword", "").trim();
    String recipient = request.getOrDefault("recipient", "").trim();
    if (senderEmail.isBlank() || appPassword.isBlank() || recipient.isBlank()) {
      return ResponseEntity.badRequest()
          .body(Map.of("message", "Sender email, app password, and recipient are required"));
    }
    try {
      emailService.sendTest(senderEmail, appPassword, recipient);
      return ResponseEntity.ok(Map.of("message", "Test email sent"));
    } catch (Exception error) {
      return ResponseEntity.internalServerError()
          .body(Map.of("message", "Email delivery failed: " + error.getMessage()));
    }
  }
}
