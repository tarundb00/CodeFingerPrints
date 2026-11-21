package com.example.codeFingerPrint.services;

import java.time.Duration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpEntity;
import com.example.codeFingerPrint.entity.GitHubConfig;
import com.example.codeFingerPrint.entity.Student;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.JsonNode;
import java.util.*;

@Service
public class PythonAnalyzerClient {
  private final RestTemplate client;
  private final String url;

  public PythonAnalyzerClient(@Value("${python.analyzer.url:http://localhost:9000}") String url,
      @Value("${python.analyzer.read-timeout:PT30M}") Duration timeout) {
    this.url = url;
    var factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(5));
    factory.setReadTimeout(timeout);
    client = new RestTemplate(factory);
  }

  public JsonNode analyzeRepo(String repo, String branch, GitHubConfig config, List<Student> students, Map<Integer, String> submitters) {
    Map<String, Object> request = new HashMap<>();
    request.put("repo", repo);
    request.put("portal_pull_authors", submitters);
    if (branch != null && !branch.isBlank()) request.put("branch", branch);
    var headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    if (config != null && config.isTokenConfigured()) headers.setBearerAuth(config.getPersonalAccessToken());
    request.put("students", students.stream().map(s -> {
      Map<String, String> identity = new HashMap<>();
      identity.put("usn", s.getUsn());
      identity.put("login", s.getGithubUsername());
      identity.put("email", s.getEmail());
      identity.put("name", s.getName());
      return identity;
    }).toList());
    return client.postForObject(url + "/analyze/project", new HttpEntity<>(request, headers), JsonNode.class);
  }
}
