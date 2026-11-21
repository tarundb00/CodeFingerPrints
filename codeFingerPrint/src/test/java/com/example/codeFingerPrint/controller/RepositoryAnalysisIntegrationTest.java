package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.*;
import com.example.codeFingerPrint.repository.*;
import com.example.codeFingerPrint.services.ProjectAnalysisService;
import com.example.codeFingerPrint.services.WebhookRefreshService;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.concurrent.atomic.AtomicInteger;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class RepositoryAnalysisIntegrationTest {
  static HttpServer server;
  static final AtomicInteger requests = new AtomicInteger();
  static volatile String requestBody;
  static final String result = """
    {"owner":"class","repo":"assignment","branch":"main","analyzed_at":"2026-07-01T00:00:00Z",
    "period_start":"2026-06-01","quality":[],"contributors":[{"usn":"S1","author":"reviewer",
    "commits":0,"pull_requests":1,"issues_closed":1,"reviews":2,"score":30,"code_share":0,
    "score_parts":{"reviews":15,"issues":7.5,"pull_requests":7.5},"daily":{"2026-06-30":2},
    "active_days":1,"last_activity":"2026-06-30T12:00:00Z","last_commit_date":null,
    "status":"ACTIVE","ownership":[]},{"usn":null,"author":"external"}]}
    """;

  @DynamicPropertySource
  static void analyzerUrl(DynamicPropertyRegistry properties) throws Exception {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/analyze/project", exchange -> {
      requests.incrementAndGet();
      requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
      byte[] body = result.getBytes(StandardCharsets.UTF_8);
      exchange.getResponseHeaders().set("Content-Type", "application/json");
      exchange.sendResponseHeaders(200, body.length);
      try (var output = exchange.getResponseBody()) { output.write(body); }
    });
    server.start();
    properties.add("python.analyzer.url", () -> "http://127.0.0.1:" + server.getAddress().getPort());
  }

  @AfterAll static void stop() { if (server != null) server.stop(0); }

  @Autowired ProjectRepository projects;
  @Autowired StudentRepository students;
  @Autowired ContributionRepository scores;
  @Autowired GitHubConfigRepository configs;
  @Autowired WebhookDeliveryRepository deliveries;
  @Autowired ProjectAnalysisService analysis;
  @Autowired WebhookRefreshService queue;
  @Autowired GitHubWebhookController webhook;
  @Autowired StudentReportController studentReports;
  @Autowired ObjectMapper json;

  @Test @Transactional
  void manualAndSignedRefreshShareOneSnapshotAndKeepTeacherMarks() throws Exception {
    var project = new Project();
    project.setName("Class assignment");
    project.setGithubRepoName("class/assignment");
    project.setTeamId(101L);
    projects.saveAndFlush(project);
    var student = new Student();
    student.setUsn("S1");
    student.setGithubUsername("reviewer");
    student.setTeamId(101L);
    students.save(student);
    var config = new GitHubConfig();
    config.setStatus("active");
    config.setPersonalAccessToken("test-fixture-token");
    config.setWebhookSecret("fixture-secret");
    configs.save(config);
    assertThat(json.writeValueAsString(config)).doesNotContain("fixture-secret", "test-fixture-token");
    int before = requests.get();
    analysis.refresh(project.getId(), "teacher");
    assertThat(json.readTree(requestBody).path("students").get(0).path("login").asString()).isEqualTo("reviewer");
    var score = scores.findByStudentUsnAndProjectId("S1", project.getId()).orElseThrow();
    assertThat(score.getStatus()).isEqualTo("ACTIVE");
    assertThat(score.getIssuesClosed()).isEqualTo(1);
    assertThat(score.getReviewComments()).isEqualTo(2);
    score.setReportScore(21);
    score.setMarksPublished(true);
    scores.saveAndFlush(score);

    byte[] payload = "{\"repository\":{\"full_name\":\"class/assignment\"}}".getBytes(StandardCharsets.UTF_8);
    var mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec("fixture-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    String signature = "sha256=" + HexFormat.of().formatHex(mac.doFinal(payload));
    assertThat(webhook.receive(payload, "wrong", "push", "d1").getStatusCode().value()).isEqualTo(401);
    assertThat(webhook.receive(payload, signature, "push", "d1").getStatusCode().value()).isEqualTo(202);
    webhook.receive(payload, signature, "push", "d1");
    webhook.receive(payload, signature, "issues", "d2");
    assertThat(deliveries.findByProjectIdAndProcessedFalseAndNextAttemptLessThanEqual(project.getId(), Instant.now())).hasSize(2);
    queue.process(project.getId());
    webhook.receive(payload, signature, "push", "d1");
    queue.process(project.getId());
    assertThat(requests.get() - before).isEqualTo(2);
    assertThat(scores.findByProjectId(project.getId())).hasSize(1);
    assertThat(score.getReportScore()).isEqualTo(21);
    assertThat(score.getMarksPublished()).isTrue();
    assertThat(analysis.report(project.getId()).path("contributors").size()).isEqualTo(2);
    var request = new MockHttpServletRequest();
    assertThat(studentReports.report("S1", project.getId(), request).getStatusCode().value()).isEqualTo(403);
    request.getSession().setAttribute("reportStudentUsn", "S1");
    var response = studentReports.report("S1", project.getId(), request);
    assertThat(json.writeValueAsString(response.getBody())).contains("reviewer").doesNotContain("external");
  }
}
