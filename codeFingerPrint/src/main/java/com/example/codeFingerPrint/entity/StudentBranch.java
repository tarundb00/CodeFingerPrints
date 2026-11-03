package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "student_branches")
public class StudentBranch {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long projectId;
  private Long teamId;
  private Long studentId;
  private String studentUsn;
  private String studentName;
  private String githubUsername;
  private String branchName;
  private String status; // active | pr_open | merged | rejected | conflict
  private Integer prNumber;
  private String prUrl;

  public Long getId() {
    return id;
  }

  public Long getProjectId() {
    return projectId;
  }

  public void setProjectId(Long projectId) {
    this.projectId = projectId;
  }

  public Long getTeamId() {
    return teamId;
  }

  public void setTeamId(Long teamId) {
    this.teamId = teamId;
  }

  public Long getStudentId() {
    return studentId;
  }

  public void setStudentId(Long studentId) {
    this.studentId = studentId;
  }

  public String getStudentUsn() {
    return studentUsn;
  }

  public void setStudentUsn(String studentUsn) {
    this.studentUsn = studentUsn;
  }

  public String getStudentName() {
    return studentName;
  }

  public void setStudentName(String studentName) {
    this.studentName = studentName;
  }

  public String getGithubUsername() {
    return githubUsername;
  }

  public void setGithubUsername(String githubUsername) {
    this.githubUsername = githubUsername;
  }

  public String getBranchName() {
    return branchName;
  }

  public void setBranchName(String branchName) {
    this.branchName = branchName;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Integer getPrNumber() {
    return prNumber;
  }

  public void setPrNumber(Integer prNumber) {
    this.prNumber = prNumber;
  }

  public String getPrUrl() {
    return prUrl;
  }

  public void setPrUrl(String prUrl) {
    this.prUrl = prUrl;
  }
}
