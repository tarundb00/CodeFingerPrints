package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_audits", indexes = {
    @Index(name = "idx_project_audit_project", columnList = "projectId"),
    @Index(name = "idx_project_audit_created", columnList = "createdAt")
})
public class ProjectAudit {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long projectId;
  private String action;
  private String actor;
  private Integer contributorCount;
  private Double averageScore;
  private LocalDateTime createdAt;

  @PrePersist
  public void onCreate() {
    createdAt = LocalDateTime.now();
  }

  public Long getId() { return id; }
  public Long getProjectId() { return projectId; }
  public void setProjectId(Long projectId) { this.projectId = projectId; }
  public String getAction() { return action; }
  public void setAction(String action) { this.action = action; }
  public String getActor() { return actor; }
  public void setActor(String actor) { this.actor = actor; }
  public Integer getContributorCount() { return contributorCount; }
  public void setContributorCount(Integer contributorCount) { this.contributorCount = contributorCount; }
  public Double getAverageScore() { return averageScore; }
  public void setAverageScore(Double averageScore) { this.averageScore = averageScore; }
  public LocalDateTime getCreatedAt() { return createdAt; }
}
