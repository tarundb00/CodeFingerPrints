package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.GitHubConfig;
import com.example.codeFingerPrint.repository.GitHubConfigRepository;
import com.example.codeFingerPrint.dtos.response.MessageResponse;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/github")
@CrossOrigin(origins = "*")
public class GitHubConfigController {

  private final GitHubConfigRepository repo;
  private final RestTemplate restTemplate = new RestTemplate();
  private static final String GH_API = "https://api.github.com";
  private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

  public GitHubConfigController(GitHubConfigRepository repo) {
    this.repo = repo;
  }

  /* ── CRUD ── */

  @GetMapping
  public List<GitHubConfig> getAll() {
    return repo.findAll();
  }

  @GetMapping("/{id}")
  public ResponseEntity<GitHubConfig> getById(@PathVariable Long id) {
    return repo.findById(id).map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping
  public ResponseEntity<GitHubConfig> create(@RequestBody GitHubConfig cfg) {
    String now = LocalDateTime.now().format(FMT);
    cfg.setStatus("active");
    cfg.setCreatedAt(now);
    cfg.setUpdatedAt(now);
    return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(cfg));
  }

  @PutMapping("/{id}")
  public ResponseEntity<GitHubConfig> update(@PathVariable Long id, @RequestBody GitHubConfig body) {
    return repo.findById(id).map(existing -> {
      existing.setName(body.getName());
      if (body.getPersonalAccessToken() != null && !body.getPersonalAccessToken().isBlank()) {
        existing.setPersonalAccessToken(body.getPersonalAccessToken());
      }
      existing.setOrganizationName(body.getOrganizationName());
      existing.setDefaultBranch(body.getDefaultBranch());
      existing.setRepoVisibility(body.getRepoVisibility());
      if (body.getWebhookSecret() != null && !body.getWebhookSecret().isBlank()) {
        existing.setWebhookSecret(body.getWebhookSecret());
      }
      existing.setWebhookUrl(body.getWebhookUrl());
      existing.setAppClientId(body.getAppClientId());
      if (body.getAppClientSecret() != null && !body.getAppClientSecret().isBlank()) {
        existing.setAppClientSecret(body.getAppClientSecret());
      }
      existing.setStatus(body.getStatus() != null ? body.getStatus() : existing.getStatus());
      existing.setUpdatedAt(LocalDateTime.now().format(FMT));
      return ResponseEntity.ok(repo.save(existing));
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id) {
    if (!repo.existsById(id))
      return ResponseEntity.notFound().build();
    repo.deleteById(id);
    return ResponseEntity.ok(new MessageResponse("Configuration deleted"));
  }

  /* ── TEST CONNECTION ── */

  @PostMapping("/{id}/test")
  public ResponseEntity<Map<String, Object>> testConnection(@PathVariable Long id) {
    GitHubConfig cfg = repo.findById(id).orElse(null);
    if (cfg == null)
      return ResponseEntity.notFound().build();
    try {
      HttpHeaders headers = bearerHeaders(cfg.getPersonalAccessToken());
      ResponseEntity<Map> response = restTemplate.exchange(
          GH_API + "/user", HttpMethod.GET,
          new HttpEntity<>(headers), Map.class);
      String login = (String) response.getBody().get("login");
      Map<String, Object> ok = new java.util.HashMap<>();
      ok.put("success", true);
      ok.put("message", "Connected as: " + login);
      ok.put("login", login);
      return ResponseEntity.ok(ok);
    } catch (Exception e) {
      Map<String, Object> fail = new java.util.HashMap<>();
      fail.put("success", false);
      fail.put("message", "Connection failed: " + e.getMessage());
      return ResponseEntity.ok(fail);
    }
  }

  /* ── CREATE GITHUB REPOSITORY ── */

  @PostMapping("/create-repo")
  public ResponseEntity<Map<String, Object>> createRepo(@RequestBody Map<String, Object> body) {
    // Load active config
    GitHubConfig cfg = repo.findFirstByStatusOrderByIdDesc("active")
        .orElse(null);
    if (cfg == null || cfg.getPersonalAccessToken() == null || cfg.getPersonalAccessToken().isBlank()) {
      return ResponseEntity.badRequest().body(Map.of(
          "success", false,
          "message", "No active GitHub configuration found. Please add one in GitHub Settings."));
    }

    String repoName = (String) body.getOrDefault("repoName", "");
    String description = (String) body.getOrDefault("description", "");
    String visibility = (String) body.getOrDefault("visibility",
        cfg.getRepoVisibility() != null ? cfg.getRepoVisibility() : "private");
    boolean isPrivate = !"public".equalsIgnoreCase(visibility);
    String org = cfg.getOrganizationName();

    if (repoName.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("success", false, "message", "repoName is required"));
    }

    HttpHeaders headers = bearerHeaders(cfg.getPersonalAccessToken());
    Map<String, Object> payload = Map.of(
        "name", repoName,
        "description", description,
        "private", isPrivate,
        "auto_init", true);

    try {
      String url;
      if (org != null && !org.isBlank()) {
        try {
          restTemplate.exchange(GH_API + "/orgs/" + org, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
          url = GH_API + "/orgs/" + org + "/repos";
        } catch (HttpClientErrorException e) {
          if (e.getStatusCode().value() == 404) {
            url = GH_API + "/user/repos";
          } else {
            throw e;
          }
        }
      } else {
        url = GH_API + "/user/repos";
      }

      ResponseEntity<Map> response = restTemplate.exchange(
          url, HttpMethod.POST,
          new HttpEntity<>(payload, headers), Map.class);

      Map<String, Object> ghRepo = response.getBody();
      String repoUrl = (String) ghRepo.get("html_url");
      String cloneUrl = (String) ghRepo.get("clone_url");

      // Add collaborators if provided
      @SuppressWarnings("unchecked")
      List<String> collaborators = (List<String>) body.get("collaborators");
      if (collaborators != null && !collaborators.isEmpty()) {
        String repoOwner = (String) ((Map<?, ?>) ghRepo.get("owner")).get("login");
        if (repoOwner == null || repoOwner.isBlank()) {
          repoOwner = (org != null && !org.isBlank()) ? org : "";
        }
        for (String username : collaborators) {
          if (username == null || username.isBlank())
            continue;
          try {
            restTemplate.exchange(
                GH_API + "/repos/" + repoOwner + "/" + repoName + "/collaborators/" + username,
                HttpMethod.PUT,
                new HttpEntity<>(Map.of("permission", "push"), headers),
                Map.class);
          } catch (Exception ignored) {
            /* skip invalid usernames */ }
        }
      }

      return ResponseEntity.ok(Map.of(
          "success", true,
          "message", "Repository created successfully",
          "repoUrl", repoUrl,
          "cloneUrl", cloneUrl));

    } catch (HttpClientErrorException e) {
      String msg = e.getResponseBodyAsString();
      return ResponseEntity.status(e.getStatusCode()).body(Map.of(
          "success", false,
          "message", "GitHub API error: " + msg));
    } catch (Exception e) {
      return ResponseEntity.internalServerError().body(Map.of(
          "success", false,
          "message", "Failed to create repository: " + e.getMessage()));
    }
  }

  /* ── HELPERS ── */

  private HttpHeaders bearerHeaders(String token) {
    HttpHeaders h = new HttpHeaders();
    h.set("Authorization", "Bearer " + token);
    h.set("Accept", "application/vnd.github+json");
    h.set("X-GitHub-Api-Version", "2022-11-28");
    h.setContentType(MediaType.APPLICATION_JSON);
    return h;
  }
}
