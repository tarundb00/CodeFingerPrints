package com.example.codeFingerPrint.dtos.response;

import java.util.List;

public class JwtResponse {

  private String accessToken;
  private String type = "Bearer";
  private Long id;
  private String email;
  private String firstName;
  private String lastName;
  private String profilePictureUrl;
  private List<String> roles;

  public JwtResponse(String accessToken, Long id, String email,
      String firstName, String lastName, String profilePictureUrl,
      List<String> roles) {
    this.accessToken = accessToken;
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.profilePictureUrl = profilePictureUrl;
    this.roles = roles;
  }

  public String getAccessToken() { return accessToken; }
  public void setAccessToken(String t) { this.accessToken = t; }

  public String getTokenType() { return type; }
  public void setTokenType(String t) { this.type = t; }

  public Long getId() { return id; }
  public void setId(Long id) { this.id = id; }

  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }

  public String getFirstName() { return firstName; }
  public void setFirstName(String firstName) { this.firstName = firstName; }

  public String getLastName() { return lastName; }
  public void setLastName(String lastName) { this.lastName = lastName; }

  public String getProfilePictureUrl() { return profilePictureUrl; }
  public void setProfilePictureUrl(String url) { this.profilePictureUrl = url; }

  public List<String> getRoles() { return roles; }
  public void setRoles(List<String> roles) { this.roles = roles; }
}
