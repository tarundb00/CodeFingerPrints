package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bug_reports")
public class BugReport {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long projectId;
  private Long teamId;

  private String title;

  @Column(length = 2000)
  private String description;

  // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  private String status = "OPEN";

  // LOW, MEDIUM, HIGH, CRITICAL
  private String severity = "MEDIUM";

  // BUG, ERROR, FEATURE, IMPROVEMENT
  private String type = "BUG";

  private String reportedByUsn;
  private String reportedByName;
  private String assignedToUsn;

  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
  private LocalDateTime resolvedAt;

  @Column(length = 2000)
  private String resolution;

  @PrePersist
  public void onCreate() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

  @PreUpdate
  public void onUpdate() { updatedAt = LocalDateTime.now(); }

  public Long getId() { return id; }

  public Long getProjectId() { return projectId; }
  public void setProjectId(Long projectId) { this.projectId = projectId; }

  public Long getTeamId() { return teamId; }
  public void setTeamId(Long teamId) { this.teamId = teamId; }

  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }

  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public String getSeverity() { return severity; }
  public void setSeverity(String severity) { this.severity = severity; }

  public String getType() { return type; }
  public void setType(String type) { this.type = type; }

  public String getReportedByUsn() { return reportedByUsn; }
  public void setReportedByUsn(String reportedByUsn) { this.reportedByUsn = reportedByUsn; }

  public String getReportedByName() { return reportedByName; }
  public void setReportedByName(String reportedByName) { this.reportedByName = reportedByName; }

  public String getAssignedToUsn() { return assignedToUsn; }
  public void setAssignedToUsn(String assignedToUsn) { this.assignedToUsn = assignedToUsn; }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }

  public LocalDateTime getResolvedAt() { return resolvedAt; }
  public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

  public String getResolution() { return resolution; }
  public void setResolution(String resolution) { this.resolution = resolution; }
}
