package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "milestones")
public class Milestone {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long teamId;
  private Long projectId;

  private String title;
  private LocalDate dueDate;
  private Boolean completed = false;
  private String completedByUsn;
  private LocalDate completedAt;
  private Boolean approved = false;
  private String approvedByUsn;
  private LocalDate approvedAt;

  public Long getId() {
    return id;
  }

  public Long getTeamId() {
    return teamId;
  }

  public void setTeamId(Long teamId) {
    this.teamId = teamId;
  }

  public Long getProjectId() {
    return projectId;
  }

  public void setProjectId(Long projectId) {
    this.projectId = projectId;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public LocalDate getDueDate() {
    return dueDate;
  }

  public void setDueDate(LocalDate dueDate) {
    this.dueDate = dueDate;
  }

  public Boolean getCompleted() {
    return completed;
  }

  public void setCompleted(Boolean completed) {
    this.completed = completed;
  }

  public String getCompletedByUsn() {
    return completedByUsn;
  }

  public void setCompletedByUsn(String completedByUsn) {
    this.completedByUsn = completedByUsn;
  }

  public LocalDate getCompletedAt() {
    return completedAt;
  }

  public void setCompletedAt(LocalDate completedAt) {
    this.completedAt = completedAt;
  }

  public Boolean getApproved() {
    return approved;
  }

  public void setApproved(Boolean approved) {
    this.approved = approved;
  }

  public String getApprovedByUsn() {
    return approvedByUsn;
  }

  public void setApprovedByUsn(String approvedByUsn) {
    this.approvedByUsn = approvedByUsn;
  }

  public LocalDate getApprovedAt() {
    return approvedAt;
  }

  public void setApprovedAt(LocalDate approvedAt) {
    this.approvedAt = approvedAt;
  }
}
