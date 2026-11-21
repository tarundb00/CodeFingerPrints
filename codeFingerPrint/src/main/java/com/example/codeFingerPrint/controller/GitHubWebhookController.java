package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.services.GitHubWebhookRegistration;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.example.codeFingerPrint.security.UserDetailsImpl;
import java.util.Map;
import java.io.IOException;
import java.security.GeneralSecurityException;
import com.example.codeFingerPrint.repository.GitHubConfigRepository;
import com.example.codeFingerPrint.repository.ProjectRepository;
import com.example.codeFingerPrint.services.ProjectAnalysisService;
import com.example.codeFingerPrint.services.WebhookRefreshService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.ObjectMapper;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Set;

@RestController
public class GitHubWebhookController {
  private final GitHubConfigRepository configs;
  private final ProjectRepository projects;
  private final WebhookRefreshService queue;
  private final ObjectMapper json;
  private final GitHubWebhookRegistration registration;

  public GitHubWebhookController(GitHubConfigRepository configs, ProjectRepository projects, WebhookRefreshService queue, ObjectMapper json,
      GitHubWebhookRegistration registration) {
    this.registration = registration;
    this.configs = configs;
    this.projects = projects;
    this.queue = queue;
    this.json = json;
  }

  @CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000", "${app.frontend.origin:http://localhost:3000}"})
  @PostMapping("/api/contributions/project/{projectId}/webhook")
  public ResponseEntity<?> connect(@PathVariable Long projectId,
      @AuthenticationPrincipal UserDetailsImpl user) {
    var project = projects.findById(projectId).orElse(null);
    if (!ContributionController.canAnalyze(project, user)) return ResponseEntity.status(403).build();
    var config = configs.findFirstByStatusOrderByIdDesc("active").orElse(null);
    if (config == null) return ResponseEntity.badRequest().body(Map.of("message", "Add an active GitHub configuration first."));
    try {
      registration.connect(ProjectAnalysisService.fullName(project, config), config);
      return ResponseEntity.ok(Map.of("message", "GitHub monitoring connected."));
    } catch (IllegalArgumentException ex) {
      return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    } catch (IOException ex) {
      return ResponseEntity.status(502).body(Map.of("message", ex.getMessage() == null ? "GitHub connection failed." : ex.getMessage()));
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      return ResponseEntity.status(503).build();
    }
  }

  static boolean verified(byte[] payload, String signature, String secret) {
    if (secret == null || secret.isBlank() || signature == null || !signature.matches("sha256=[0-9a-fA-F]{64}"))
      return false;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      return MessageDigest.isEqual(mac.doFinal(payload), HexFormat.of().parseHex(signature.substring(7)));
    } catch (GeneralSecurityException ex) { throw new IllegalStateException(ex); }
  }

  @PostMapping("/api/github/webhook")
  public ResponseEntity<Void> receive(@RequestBody byte[] payload,
      @RequestHeader(value="X-Hub-Signature-256", required=false) String signature,
      @RequestHeader("X-GitHub-Event") String event, @RequestHeader("X-GitHub-Delivery") String delivery) {
    var config = configs.findFirstByStatusOrderByIdDesc("active").orElse(null);
    if (config == null || !verified(payload, signature, config.getWebhookSecret())) return ResponseEntity.status(401).build();
    if (!delivery.matches("[a-zA-Z0-9-]{1,80}")) return ResponseEntity.badRequest().build();
    if (!Set.of("push", "pull_request", "pull_request_review", "issues").contains(event))
      return ResponseEntity.noContent().build();
    String fullName;
    try { fullName = json.readTree(payload).path("repository").path("full_name").asString(""); }
    catch (RuntimeException ex) { return ResponseEntity.badRequest().build(); }
    if (!fullName.matches("[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")) return ResponseEntity.badRequest().build();
    projects.findAll().stream().filter(p -> fullName.equalsIgnoreCase(ProjectAnalysisService.fullName(p, config)))
        .forEach(p -> queue.enqueue(p.getId(), delivery));
    return ResponseEntity.accepted().build();
  }
}
