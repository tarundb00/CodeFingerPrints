package com.example.codeFingerPrint.services;

import com.example.codeFingerPrint.entity.GitHubConfig;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicReference;
import static org.assertj.core.api.Assertions.assertThat;

class GitHubWebhookRegistrationTest {
  @Test
  void connectsAndUpdatesTheSameHookWhilePreservingOtherEvents() throws Exception {
    ObjectMapper json = new ObjectMapper();
    var active = new AtomicReference<JsonNode>();
    var methods = new CopyOnWriteArrayList<String>();
    HttpServer github = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    github.createContext("/repos/org/project/hooks", exchange -> {
      String method = exchange.getRequestMethod();
      methods.add(method + " " + exchange.getRequestURI().getPath());
      String response;
      if (method.equals("GET")) {
        response = active.get() == null ? "[]" : json.writeValueAsString(List.of(Map.of(
            "id", 7, "config", active.get().get("config"), "events", List.of("release"))));
      } else {
        active.set(json.readTree(exchange.getRequestBody().readAllBytes()));
        response = "{\"id\":7}";
      }
      byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(method.equals("POST") ? 201 : 200, bytes.length);
      try (var out = exchange.getResponseBody()) { out.write(bytes); }
    });
    github.start();
    try {
      var registration = new GitHubWebhookRegistration(json, "http://127.0.0.1:" + github.getAddress().getPort());
      var cfg = new GitHubConfig();
      cfg.setPersonalAccessToken("fixture");
      cfg.setWebhookSecret("test-secret");
      cfg.setWebhookUrl("https://class.example/api/github/webhook");
      registration.connect("org/project", cfg);
      registration.connect("org/project", cfg);
      assertThat(methods).containsExactly("GET /repos/org/project/hooks", "POST /repos/org/project/hooks",
          "GET /repos/org/project/hooks", "PATCH /repos/org/project/hooks/7");
      assertThat(active.get().path("config").path("secret").asString()).isEqualTo("test-secret");
      assertThat(active.get().path("events").toString()).contains("release", "push", "issues", "pull_request_review");
    } finally { github.stop(0); }
  }
}
