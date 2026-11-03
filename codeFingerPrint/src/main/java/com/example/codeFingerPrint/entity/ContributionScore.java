package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contribution_scores", indexes = {
  @Index(name = "idx_contribution_project", columnList = "projectId"),
  @Index(name = "idx_contribution_team", columnList = "teamId"),
  @Index(name = "idx_contribution_student_project", columnList = "studentUsn,projectId"),
  @Index(name = "idx_contribution_status", columnList = "status")
})
public class ContributionScore {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String studentUsn;
  private String studentName;
  private String studentEmail;
  private Long projectId;
  private Long teamId;

  // Raw GitHub stats
  private Integer totalCommits;
  private Integer linesAdded;
  private Integer linesDeleted;
  private Integer activeDays;
  private Integer pullRequests;
  private Integer issuesClosed;
  private Integer reviewComments;

  // Calculated score (0-100)
  private Double score;

  // Teacher-entered assessment marks
  private Integer presentationScore;
  private Integer reportScore;
  private Integer documentationScore;
  private Integer teacherAiPenalty;
  private Boolean marksPublished = false;

  @Column(length = 2000)
  private String manualFeedback;

  // Status: ACTIVE, AT_RISK, INACTIVE, NOT_CONTRIBUTING
  private String status;

  private LocalDateTime lastCommitDate;
  private LocalDateTime lastAnalyzedAt;

  @PrePersist
  @PreUpdate
  public void onUpdate() {
    lastAnalyzedAt = LocalDateTime.now();
  }

  public Long getId() { return id; }

  public String getStudentUsn() { return studentUsn; }
  public void setStudentUsn(String studentUsn) { this.studentUsn = studentUsn; }

  public String getStudentName() { return studentName; }
  public void setStudentName(String studentName) { this.studentName = studentName; }

  public String getStudentEmail() { return studentEmail; }
  public void setStudentEmail(String studentEmail) { this.studentEmail = studentEmail; }

  public Long getProjectId() { return projectId; }
  public void setProjectId(Long projectId) { this.projectId = projectId; }

  public Long getTeamId() { return teamId; }
  public void setTeamId(Long teamId) { this.teamId = teamId; }

  public Integer getTotalCommits() { return totalCommits; }
  public void setTotalCommits(Integer totalCommits) { this.totalCommits = totalCommits; }

  public Integer getLinesAdded() { return linesAdded; }
  public void setLinesAdded(Integer linesAdded) { this.linesAdded = linesAdded; }

  public Integer getLinesDeleted() { return linesDeleted; }
  public void setLinesDeleted(Integer linesDeleted) { this.linesDeleted = linesDeleted; }

  public Integer getActiveDays() { return activeDays; }
  public void setActiveDays(Integer activeDays) { this.activeDays = activeDays; }

  public Integer getPullRequests() { return pullRequests; }
  public void setPullRequests(Integer pullRequests) { this.pullRequests = pullRequests; }

  public Integer getIssuesClosed() { return issuesClosed; }
  public void setIssuesClosed(Integer issuesClosed) { this.issuesClosed = issuesClosed; }

  public Integer getReviewComments() { return reviewComments; }
  public void setReviewComments(Integer reviewComments) { this.reviewComments = reviewComments; }

  public Double getScore() { return score; }
  public void setScore(Double score) { this.score = score; }

  public Integer getPresentationScore() { return presentationScore; }
  public void setPresentationScore(Integer presentationScore) { this.presentationScore = presentationScore; }

  public Integer getReportScore() { return reportScore; }
  public void setReportScore(Integer reportScore) { this.reportScore = reportScore; }

  public Integer getDocumentationScore() { return documentationScore; }
  public void setDocumentationScore(Integer documentationScore) { this.documentationScore = documentationScore; }

  public Integer getTeacherAiPenalty() { return teacherAiPenalty; }
  public void setTeacherAiPenalty(Integer teacherAiPenalty) { this.teacherAiPenalty = teacherAiPenalty; }

  public Boolean getMarksPublished() { return marksPublished; }
  public void setMarksPublished(Boolean marksPublished) { this.marksPublished = marksPublished; }

  public String getManualFeedback() { return manualFeedback; }
  public void setManualFeedback(String manualFeedback) { this.manualFeedback = manualFeedback; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public LocalDateTime getLastCommitDate() { return lastCommitDate; }
  public void setLastCommitDate(LocalDateTime lastCommitDate) { this.lastCommitDate = lastCommitDate; }

  public LocalDateTime getLastAnalyzedAt() { return lastAnalyzedAt; }
}
