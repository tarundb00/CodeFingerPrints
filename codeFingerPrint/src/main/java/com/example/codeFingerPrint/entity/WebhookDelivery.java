package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(indexes = @Index(name="idx_webhook_due", columnList="processed,nextAttempt"))
public class WebhookDelivery {
  @Id
  private String id;
  private Long projectId;
  private boolean processed;
  private Instant nextAttempt;
  private int attempts;

  protected WebhookDelivery() {}
  public WebhookDelivery(String delivery, Long projectId) {
    this.id = delivery + "/" + projectId;
    this.projectId = projectId;
    this.nextAttempt = Instant.now();
  }
  public Long getProjectId() { return projectId; }
  public void complete() { processed = true; }
  public void retry() {
    attempts++;
    nextAttempt = Instant.now().plusSeconds(Math.min(3600, 10L << Math.min(attempts, 9)));
  }
}
