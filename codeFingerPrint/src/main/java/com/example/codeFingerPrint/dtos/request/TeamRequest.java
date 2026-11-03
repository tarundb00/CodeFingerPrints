package com.example.codeFingerPrint.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

public class TeamRequest {

  @NotBlank
  private String teamName;

  @NotBlank
  private String teamNumber;

  @NotBlank
  private String projectName;

  @NotBlank
  private String projectType;

  @NotBlank
  private String description;

  @NotNull
  private Integer minStudents;

  @NotNull
  private Integer maxStudents;

  private String teamLeadUsn;
  private String githubRepoName;
  private String githubOwner;
  private String githubVisibility;
  private String githubDescription;
  private List<String> githubCollaborators = new ArrayList<>();
  private List<MemberRequest> members = new ArrayList<>();

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

  public List<MemberRequest> getMembers() {
    return members;
  }

  public void setMembers(List<MemberRequest> members) {
    this.members = members;
  }

}
