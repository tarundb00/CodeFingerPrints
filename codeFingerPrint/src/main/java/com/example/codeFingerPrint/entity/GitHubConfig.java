package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "github_configs")
public class GitHubConfig {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  @Column(length = 512)
  private String personalAccessToken;

  private String organizationName;
  private String defaultBranch;
  private String repoVisibility;

  @Column(length = 512)
  private String webhookSecret;

  @Column(length = 512)
  private String webhookUrl;

  private String appClientId;

  @Column(length = 512)
  private String appClientSecret;

  private String status;
  private String createdAt;
  private String updatedAt;

  public Long getId() { return id; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getPersonalAccessToken() { return personalAccessToken; }
  public void setPersonalAccessToken(String personalAccessToken) { this.personalAccessToken = personalAccessToken; }

  public String getOrganizationName() { return organizationName; }
  public void setOrganizationName(String organizationName) { this.organizationName = organizationName; }

  public String getDefaultBranch() { return defaultBranch; }
  public void setDefaultBranch(String defaultBranch) { this.defaultBranch = defaultBranch; }

  public String getRepoVisibility() { return repoVisibility; }
  public void setRepoVisibility(String repoVisibility) { this.repoVisibility = repoVisibility; }

  public String getWebhookSecret() { return webhookSecret; }
  public void setWebhookSecret(String webhookSecret) { this.webhookSecret = webhookSecret; }

  public String getWebhookUrl() { return webhookUrl; }
  public void setWebhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; }

  public String getAppClientId() { return appClientId; }
  public void setAppClientId(String appClientId) { this.appClientId = appClientId; }

  public String getAppClientSecret() { return appClientSecret; }
  public void setAppClientSecret(String appClientSecret) { this.appClientSecret = appClientSecret; }

  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }

  public String getCreatedAt() { return createdAt; }
  public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

  public String getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
