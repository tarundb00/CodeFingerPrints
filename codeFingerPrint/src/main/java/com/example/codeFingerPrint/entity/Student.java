package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "students", indexes = {
  @Index(name = "idx_student_team", columnList = "teamId"),
  @Index(name = "idx_student_teacher", columnList = "teacherId"),
  @Index(name = "idx_student_github", columnList = "githubUsername")
})
public class Student {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(unique = true, nullable = false)
  private String usn;

  private String name;

  @Column(unique = true)
  private String email;

  private String section;
  private String githubUsername;
  private String roleName;
  private Boolean approved;

  // Which team this student belongs to
  private Long teamId;

  // Which teacher added this student
  private Long teacherId;

  private LocalDateTime createdAt;

  @PrePersist
  public void prePersist() {
    createdAt = LocalDateTime.now();
  }

  public Long getId() { return id; }

  public String getUsn() { return usn; }
  public void setUsn(String usn) { this.usn = usn; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }

  public String getSection() { return section; }
  public void setSection(String section) { this.section = section; }

  public String getGithubUsername() { return githubUsername; }
  public void setGithubUsername(String githubUsername) { this.githubUsername = githubUsername; }

  public String getRoleName() { return roleName; }
  public void setRoleName(String roleName) { this.roleName = roleName; }

  public Boolean getApproved() { return approved; }
  public void setApproved(Boolean approved) { this.approved = approved; }

  public Long getTeamId() { return teamId; }
  public void setTeamId(Long teamId) { this.teamId = teamId; }

  public Long getTeacherId() { return teacherId; }
  public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }

  public LocalDateTime getCreatedAt() { return createdAt; }
}
