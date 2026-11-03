package com.example.codeFingerPrint.dtos.request;

public class MemberRequest {

  private String usn;
  private String name;
  private String email;
  private String section;
  private String roleName;
  private Boolean approved;
  private String githubUsername;

  public String getUsn() {
    return usn;
  }

  public void setUsn(String usn) {
    this.usn = usn;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getSection() {
    return section;
  }

  public void setSection(String section) {
    this.section = section;
  }

  public String getRoleName() {
    return roleName;
  }

  public void setRoleName(String roleName) {
    this.roleName = roleName;
  }

  public Boolean getApproved() {
    return approved;
  }

  public void setApproved(Boolean approved) {
    this.approved = approved;
  }

  public String getGithubUsername() {
    return githubUsername;
  }

  public void setGithubUsername(String githubUsername) {
    this.githubUsername = githubUsername;
  }
}
