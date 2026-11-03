package com.example.codeFingerPrint.services;

import com.example.codeFingerPrint.entity.GitHubConfig;
import com.example.codeFingerPrint.repository.GitHubConfigRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class PythonAnalyzerClient {

  private final RestTemplate restTemplate = new RestTemplate();
  private final String analyzerUrl;
  private final GitHubConfigRepository githubConfigRepository;

  public PythonAnalyzerClient(
      @Value("${python.analyzer.url:http://localhost:9000}") String analyzerUrl,
      GitHubConfigRepository githubConfigRepository) {
    this.analyzerUrl = analyzerUrl;
    this.githubConfigRepository = githubConfigRepository;
  }

  @SuppressWarnings("rawtypes")
  public Map<String, Object> analyzeRepo(String owner, String repo, String branch) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);

    // Fetch the active GitHub config to get the PAT
    Optional<GitHubConfig> activeConfig = githubConfigRepository.findFirstByStatusOrderByIdDesc("active");
    String pat = activeConfig.map(GitHubConfig::getPersonalAccessToken).orElse(null);

    Map<String, Object> payload = new HashMap<>();
    payload.put("owner", owner);
    payload.put("repo", repo);
    payload.put("branch", branch);
    payload.put("token", pat);

    HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
    ResponseEntity<Map> response = restTemplate.postForEntity(analyzerUrl + "/analyze/project", request, Map.class);
    return response.getBody();
  }
}
