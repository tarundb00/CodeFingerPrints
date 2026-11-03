package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "teams")
public class Team {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank
  private String teamName;

  @NotBlank
  private String teamNumber;

  @NotBlank
  private String projectName;

  @NotBlank
  private String projectType;

  @NotBlank
  @Column(length = 1200)
  private String description;

  private Integer minStudents;
  private Integer maxStudents;
  private String teamLeadUsn;

  private Long teacherId;

  private String githubRepoName;
  private String githubOwner;
  private String githubVisibility;
  private String githubDescription;

  @ElementCollection
  @CollectionTable(name = "team_github_collaborators", joinColumns = @JoinColumn(name = "team_id"))
  @Column(name = "username")
  private List<String> githubCollaborators = new ArrayList<>();

  @Transient
  private List<TeamMember> members = new ArrayList<>();

  public Team() {
  }

  public Long getId() {
    return id;
  }

  public String getTeamName() {
    return teamName;
  }

  public void setTeamName(String teamName) {
    this.teamName = teamName;
  }

  public String getTeamNumber() {
    return teamNumber;
  }

  public void setTeamNumber(String teamNumber) {
    this.teamNumber = teamNumber;
  }

  public String getProjectName() {
    return projectName;
  }

  public void setProjectName(String projectName) {
    this.projectName = projectName;
  }

  public String getProjectType() {
    return projectType;
  }

  public void setProjectType(String projectType) {
    this.projectType = projectType;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public Integer getMinStudents() {
    return minStudents;
  }

  public void setMinStudents(Integer minStudents) {
    this.minStudents = minStudents;
  }

  public Integer getMaxStudents() {
    return maxStudents;
  }

  public void setMaxStudents(Integer maxStudents) {
    this.maxStudents = maxStudents;
  }

  public String getTeamLeadUsn() {
    return teamLeadUsn;
  }

  public void setTeamLeadUsn(String teamLeadUsn) {
    this.teamLeadUsn = teamLeadUsn;
  }

  public Long getTeacherId() {
    return teacherId;
  }

  public void setTeacherId(Long teacherId) {
    this.teacherId = teacherId;
  }

  public String getGithubRepoName() {
    return githubRepoName;
  }

  public void setGithubRepoName(String githubRepoName) {
    this.githubRepoName = githubRepoName;
  }

  public String getGithubOwner() {
    return githubOwner;
  }

  public void setGithubOwner(String githubOwner) {
    this.githubOwner = githubOwner;
  }

  public String getGithubVisibility() {
    return githubVisibility;
  }

  public void setGithubVisibility(String githubVisibility) {
    this.githubVisibility = githubVisibility;
  }

  public String getGithubDescription() {
    return githubDescription;
  }

  public void setGithubDescription(String githubDescription) {
    this.githubDescription = githubDescription;
  }

  public List<String> getGithubCollaborators() {
    return githubCollaborators;
  }

  public void setGithubCollaborators(List<String> githubCollaborators) {
    this.githubCollaborators = githubCollaborators;
  }

  public List<TeamMember> getMembers() {
    return members;
  }

  public void setMembers(List<TeamMember> members) {
    this.members = members;
  }

  public void addMember(TeamMember member) {
    members.add(member);
    member.setTeam(this);
  }
}
