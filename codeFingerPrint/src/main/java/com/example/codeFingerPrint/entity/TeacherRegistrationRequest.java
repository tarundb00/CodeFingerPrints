package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "teacher_registration_requests")
public class TeacherRegistrationRequest {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String firstName;
  private String lastName;

  @Column(unique = true)
  private String email;

  private String password;   // hashed when account is created on approval
  private String phone;
  private LocalDate dateOfBirth;
  private String gender;

  @Column(length = 1000)
  private String address;

  private String profilePictureUrl;

  @Enumerated(EnumType.STRING)
  private Status status = Status.PENDING;

  private LocalDateTime requestedAt;
  private LocalDateTime processedAt;

  @PrePersist
  public void onCreate() {
    requestedAt = LocalDateTime.now();
  }

  public enum Status {
    PENDING, APPROVED, DECLINED
  }

  // ── getters / setters ────────────────────────────────────────────────────

  public Long getId() { return id; }

  public String getFirstName() { return firstName; }
  public void setFirstName(String firstName) { this.firstName = firstName; }

  public String getLastName() { return lastName; }
  public void setLastName(String lastName) { this.lastName = lastName; }

  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }

  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }

  public String getPhone() { return phone; }
  public void setPhone(String phone) { this.phone = phone; }

  public LocalDate getDateOfBirth() { return dateOfBirth; }
  public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

  public String getGender() { return gender; }
  public void setGender(String gender) { this.gender = gender; }

  public String getAddress() { return address; }
  public void setAddress(String address) { this.address = address; }

  public String getProfilePictureUrl() { return profilePictureUrl; }
  public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

  public Status getStatus() { return status; }
  public void setStatus(Status status) { this.status = status; }

  public LocalDateTime getRequestedAt() { return requestedAt; }

  public LocalDateTime getProcessedAt() { return processedAt; }
  public void setProcessedAt(LocalDateTime processedAt) { this.processedAt = processedAt; }
}
