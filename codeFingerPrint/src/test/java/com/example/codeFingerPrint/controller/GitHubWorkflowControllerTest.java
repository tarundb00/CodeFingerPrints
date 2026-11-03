package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.GitHubConfig;
import com.example.codeFingerPrint.entity.Project;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;

class GitHubWorkflowControllerTest {

  @Test
  void branchHasNoCommitsWhenAheadByIsZero() {
    assertTrue(GitHubWorkflowController.branchHasNoCommits(Map.of("ahead_by", 0)));
  }

  @Test
  void branchHasCommitsWhenAheadByIsGreaterThanZero() {
    assertFalse(GitHubWorkflowController.branchHasNoCommits(Map.of("ahead_by", 2)));
  }

  @Test
  void normalizeGithubUsernameFallsBackToUsnWhenMissing() {
    assertEquals("sharath-123", GitHubWorkflowController.normalizeGithubUsername("", "SHARATH 123"));
  }

  @Test
  void normalizeGithubUsernameKeepsProvidedValue() {
    assertEquals("student-login", GitHubWorkflowController.normalizeGithubUsername(" student-login ", "SHARATH 123"));
  }

  @Test
  void repositoryPathUsesProjectsSavedGithubOwner() {
    GitHubWorkflowController controller = new GitHubWorkflowController(null, null, null, null, null);
    GitHubConfig config = new GitHubConfig();
    config.setPersonalAccessToken("token");
    Project project = new Project();
    project.setGithubOwner("project-owner");
    project.setGithubRepoName("student-repo");

    assertEquals("project-owner/student-repo", controller.repoPath(config, project));
  }
}
