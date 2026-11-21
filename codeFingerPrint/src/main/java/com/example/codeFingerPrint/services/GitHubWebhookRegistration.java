package com.example.codeFingerPrint.services;

import org.springframework.beans.factory.annotation.Autowired;
import com.example.codeFingerPrint.entity.GitHubConfig;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

@Service
public class GitHubWebhookRegistration {
  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  private final ObjectMapper json;
  private final String apiBase;

  @Autowired
  public GitHubWebhookRegistration(ObjectMapper json) { this(json, "https://api.github.com"); }
  GitHubWebhookRegistration(ObjectMapper json, String apiBase) {
    this.json = json;
    this.apiBase = apiBase;
  }

  public void connect(String repo, GitHubConfig config) throws IOException, InterruptedException {
    String callback = Objects.toString(config.getWebhookUrl(), "").trim();
    URI destination = URI.create(callback);
    if (!"https".equalsIgnoreCase(destination.getScheme()) || destination.getHost() == null)
      throw new IllegalArgumentException("Set a public HTTPS webhook callback URL in GitHub Settings.");
    if (!config.isTokenConfigured() || config.getWebhookSecret() == null || config.getWebhookSecret().isBlank())
      throw new IllegalArgumentException("Set the token and webhook secret in GitHub Settings.");
    if (!repo.matches("[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+"))
      throw new IllegalArgumentException("Set the repository owner and name on this project.");

    String hooks = apiBase + "/repos/" + repo + "/hooks";
    Set<String> events = new LinkedHashSet<>(List.of("push", "pull_request", "pull_request_review", "issues"));
    String hookId = null;
    for (int page = 1; hookId == null; page++) {
      JsonNode list = send("GET", hooks + "?per_page=100&page=" + page, config, null);
      for (JsonNode hook : list) {
        if (callback.equals(hook.path("config").path("url").asString(""))) {
          hookId = Long.toString(hook.path("id").asLong());
          hook.path("events").forEach(e -> events.add(e.asString()));
          break;
        }
      }
      if (list.size() < 100) break;
    }
    Map<String, Object> body = new HashMap<>();
    body.put("active", true);
    body.put("events", events.contains("*") ? List.of("*") : events);
    body.put("config", Map.of("url", callback, "content_type", "json", "secret", config.getWebhookSecret(), "insecure_ssl", "0"));
    if (hookId == null) body.put("name", "web");
    send(hookId == null ? "POST" : "PATCH", hookId == null ? hooks : hooks + "/" + hookId, config, body);
  }

  private JsonNode send(String method, String url, GitHubConfig config, Map<String, Object> body)
      throws IOException, InterruptedException {
    var request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(30))
        .header("Authorization", "Bearer " + config.getPersonalAccessToken())
        .header("Accept", "application/vnd.github+json").header("Content-Type", "application/json")
        .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
        .build();
    var response = http.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() / 100 != 2)
      throw new IOException("GitHub returned HTTP " + response.statusCode() + ". Check the repository and Webhooks write permission.");
    return json.readTree(response.body());
  }
}
