package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "admins")
public class Admin {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank
  private String firstName;

  @NotBlank
  private String lastName;

  @NotBlank
  @Email
  @Column(unique = true)
  private String email;

  @NotBlank
  private String password;

  private String phone;
  private String profilePictureUrl;

  // role is always ADMIN — no need for a roles table
  private String role = "ADMIN";

  public Admin() {}

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

  public String getProfilePictureUrl() { return profilePictureUrl; }
  public void setProfilePictureUrl(String url) { this.profilePictureUrl = url; }

  public String getRole() { return role; }
  public void setRole(String role) { this.role = role; }
}
