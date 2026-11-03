package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notification_recipient", columnList = "recipientKey"),
    @Index(name = "idx_notification_created", columnList = "createdAt"),
    @Index(name = "idx_notification_read", columnList = "is_read")
})
public class Notification {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String recipientKey;
  private String type;
  private String title;

  @Column(length = 2000)
  private String message;

  @Column(name = "is_read", nullable = false)
  private boolean read = false;
  private LocalDateTime createdAt;

  @PrePersist
  public void onCreate() { createdAt = LocalDateTime.now(); }

  public Long getId() { return id; }
  public String getRecipientKey() { return recipientKey; }
  public void setRecipientKey(String recipientKey) { this.recipientKey = recipientKey; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getMessage() { return message; }
  public void setMessage(String message) { this.message = message; }
  public boolean isRead() { return read; }
  public void setRead(boolean read) { this.read = read; }
  public LocalDateTime getCreatedAt() { return createdAt; }
}
