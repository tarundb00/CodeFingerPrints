package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "projects", indexes = {
  @Index(name = "idx_project_teacher", columnList = "teacherId"),
  @Index(name = "idx_project_team", columnList = "teamId")
})
public class Project {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;
  private String icon;

  @Column(length = 1000)
  private String description;

  private String semester;
  private String academicYear;
  private String totalMarks;
  private String startDate;
  private String endDate;
  private String status;

  // GitHub
  private String githubRepoName;
  private String githubOwner;
  private String githubBranch;
  private String githubVisibility;

  // Advanced toggles
  private Boolean aiDetect;
  private Boolean reviewImpact;
  private Boolean bugTracking;

  // Grading weights (stored as JSON string for simplicity)
  @Column(length = 500)
  private String gradingWeights;

  // Notification settings (stored as JSON string)
  @Column(length = 500)
  private String notificationSettings;

  private String alertThreshold;

  // Linked team id
  private Long teamId;

  private Long teacherId;

  private Boolean completionFinalized = false;
  private String finalizedBy;
  private LocalDateTime finalizedAt;

  public Long getId() { return id; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getIcon() { return icon; }
  public void setIcon(String icon) { this.icon = icon; }

  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }

  public String getSemester() { return semester; }
  public void setSemester(String semester) { this.semester = semester; }

  public String getAcademicYear() { return academicYear; }
  public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

  public String getTotalMarks() { return totalMarks; }
  public void setTotalMarks(String totalMarks) { this.totalMarks = totalMarks; }

  public String getStartDate() { return startDate; }
  public void setStartDate(String startDate) { this.startDate = startDate; }

  public String getEndDate() { return endDate; }
  public void setEndDate(String endDate) { this.endDate = endDate; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public String getGithubRepoName() { return githubRepoName; }
  public void setGithubRepoName(String githubRepoName) { this.githubRepoName = githubRepoName; }

  public String getGithubOwner() { return githubOwner; }
  public void setGithubOwner(String githubOwner) { this.githubOwner = githubOwner; }

  public String getGithubBranch() { return githubBranch; }
  public void setGithubBranch(String githubBranch) { this.githubBranch = githubBranch; }

  public String getGithubVisibility() { return githubVisibility; }
  public void setGithubVisibility(String githubVisibility) { this.githubVisibility = githubVisibility; }

  public Boolean getAiDetect() { return aiDetect; }
  public void setAiDetect(Boolean aiDetect) { this.aiDetect = aiDetect; }

  public Boolean getReviewImpact() { return reviewImpact; }
  public void setReviewImpact(Boolean reviewImpact) { this.reviewImpact = reviewImpact; }

  public Boolean getBugTracking() { return bugTracking; }
  public void setBugTracking(Boolean bugTracking) { this.bugTracking = bugTracking; }

  public String getGradingWeights() { return gradingWeights; }
  public void setGradingWeights(String gradingWeights) { this.gradingWeights = gradingWeights; }

  public String getNotificationSettings() { return notificationSettings; }
  public void setNotificationSettings(String notificationSettings) { this.notificationSettings = notificationSettings; }

  public String getAlertThreshold() { return alertThreshold; }
  public void setAlertThreshold(String alertThreshold) { this.alertThreshold = alertThreshold; }

  public Long getTeamId() { return teamId; }
  public void setTeamId(Long teamId) { this.teamId = teamId; }

  public Long getTeacherId() { return teacherId; }
  public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }

  public Boolean getCompletionFinalized() { return completionFinalized; }
  public void setCompletionFinalized(Boolean completionFinalized) { this.completionFinalized = completionFinalized; }

  public String getFinalizedBy() { return finalizedBy; }
  public void setFinalizedBy(String finalizedBy) { this.finalizedBy = finalizedBy; }

  public LocalDateTime getFinalizedAt() { return finalizedAt; }
  public void setFinalizedAt(LocalDateTime finalizedAt) { this.finalizedAt = finalizedAt; }
}