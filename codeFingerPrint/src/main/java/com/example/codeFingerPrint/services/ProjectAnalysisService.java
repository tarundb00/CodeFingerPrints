package com.example.codeFingerPrint.services;

import org.springframework.web.client.RestClientResponseException;
import com.example.codeFingerPrint.entity.*;
import com.example.codeFingerPrint.repository.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class ProjectAnalysisService {
  public record Updated(Long projectId) {}

  private final ProjectRepository projects;
  private final StudentRepository students;
  private final ContributionRepository scores;
  private final GitHubConfigRepository configs;
  private final ProjectAuditRepository audits;
  private final AnalysisSnapshotRepository snapshots;
  private final PythonAnalyzerClient analyzer;
  private final NotificationService notifications;
  private final ApplicationEventPublisher events;
  private final ObjectMapper json;

  public ProjectAnalysisService(ProjectRepository projects, StudentRepository students, ContributionRepository scores,
      GitHubConfigRepository configs, ProjectAuditRepository audits, AnalysisSnapshotRepository snapshots,
      PythonAnalyzerClient analyzer, NotificationService notifications, ApplicationEventPublisher events, ObjectMapper json) {
    this.projects = projects;
    this.students = students;
    this.scores = scores;
    this.configs = configs;
    this.audits = audits;
    this.snapshots = snapshots;
    this.analyzer = analyzer;
    this.notifications = notifications;
    this.events = events;
    this.json = json;
  }

  public static String fullName(Project project, GitHubConfig config) {
    String name = Objects.toString(project.getGithubRepoName(), "").trim();
    name = name.replaceFirst("(?i)^(?:https?://)?github\\.com/", "").replaceFirst("/+$", "").replaceFirst("(?i)\\.git$", "");
    if (name.isEmpty() || name.contains("/")) return name;
    String owner = project.getGithubOwner();
    if (owner == null || owner.isBlank()) owner = config == null ? null : config.getOrganizationName();
    return owner == null || owner.isBlank() ? name : owner.trim() + "/" + name;
  }

  @Transactional
  public int refresh(Long projectId, String actor) {
    Project project = projects.lockForAnalysis(projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    List<Student> roster = project.getTeamId() == null ? List.of() : students.findByTeamId(project.getTeamId());
    if (roster.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Link a team with students first.");
    GitHubConfig config = configs.findFirstByStatusOrderByIdDesc("active").orElse(null);
    String fullName = fullName(project, config);
    if (!fullName.matches("[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+"))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Set the GitHub owner and repository for this project.");
    JsonNode report;
    try {
      Map<Integer, String> submitters = new HashMap<>();
      audits.findByProjectIdAndActionAndRepositoryNameIgnoreCase(projectId, "PR_SUBMITTED", fullName)
          .forEach(a -> submitters.put(a.getPullRequestNumber(), a.getActor()));
      report = analyzer.analyzeRepo(fullName, project.getGithubBranch(), config, roster, submitters);
    } catch (RestClientResponseException ex) {
      if (ex.getStatusCode().value() == 429)
        throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "GitHub API rate limit reached. Retry after the limit resets or configure a token.", ex);
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Analyzer could not read the repository. Check Git, the branch and token permissions.", ex);
    } catch (RestClientException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Analyzer unavailable or unable to read this repository. Check the branch and GitHub permissions.", ex);
    }
    if (report == null || !report.path("contributors").isArray() || !report.has("period_start"))
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The analyzer returned an incomplete report. Restart the updated analyzer.");

    Map<String, JsonNode> byStudent = new HashMap<>();
    for (JsonNode row : report.path("contributors")) {
      if (row.path("usn").isString()) byStudent.put(row.get("usn").asString(), row);
    }
    if (roster.stream().anyMatch(s -> !byStudent.containsKey(s.getUsn())))
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Analyzer omitted a roster member.");
    var analyzedAt = OffsetDateTime.parse(report.path("analyzed_at").asString()).withOffsetSameInstant(ZoneOffset.UTC);
    double totalScore = 0;
    for (Student student : roster) {
      JsonNode row = byStudent.get(student.getUsn());
      ContributionScore score = scores.findByStudentUsnAndProjectId(student.getUsn(), projectId).orElseGet(ContributionScore::new);
      String previousStatus = score.getStatus();
      Double previousScore = score.getScore();
      score.setStudentUsn(student.getUsn());
      score.setStudentName(student.getName());
      score.setStudentEmail(student.getEmail());
      score.setTeamId(project.getTeamId());
      score.setProjectId(projectId);
      score.setTotalCommits(row.path("commits").asInt());
      score.setLinesAdded(row.path("additions").asInt());
      score.setLinesDeleted(row.path("deletions").asInt());
      score.setActiveDays(row.path("active_days").asInt());
      score.setPullRequests(row.path("pull_requests").asInt());
      score.setIssuesClosed(row.path("issues_closed").asInt());
      score.setReviewComments(row.path("reviews").asInt());
      score.setScore(row.path("score").asDouble());
      score.setScoreBreakdown(row.path("score_parts").toString());
      score.setCodeShare(row.path("code_share").asDouble());
      score.setStatus(row.path("status").asString());
      score.setLastActivityDate(row.path("last_activity").isString()
          ? OffsetDateTime.parse(row.get("last_activity").asString()).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime() : null);
      var recent = new TreeMap<String, Integer>();
      var end = analyzedAt.toLocalDate();
      score.setLastAnalyzedAt(analyzedAt.toLocalDateTime());
      for (int i = 0; i < 7; i++) {
        String day = end.minusDays(i).toString();
        recent.put(day, row.path("daily").path(day).asInt(0));
      }
      score.setRecentActivity(json.writeValueAsString(recent));
      score.setLastCommitDate(row.path("last_commit_date").isString()
          ? OffsetDateTime.parse(row.get("last_commit_date").asString()).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime() : null);
      scores.save(score);
      totalScore += score.getScore();
      boolean missing = "NOT_CONTRIBUTING".equals(score.getStatus());
      if ((missing && !Objects.equals(previousStatus, score.getStatus())) ||
          (!missing && score.getScore() < 40 && (previousScore == null || previousScore >= 40))) {
        String type = missing ? "NOT_CONTRIBUTING" : "LOW_CONTRIBUTION";
        String title = missing ? "No contribution detected" : "Low contribution alert";
        String message = student.getName() + " · " + project.getName() + " · score " + score.getScore() + "/100";
        notifications.notify(student.getUsn(), type, title, message);
        notifications.notify("TEACHER", type, title, message);
      }
    }
    AnalysisSnapshot snapshot = snapshots.findById(projectId).orElseGet(() -> new AnalysisSnapshot(project));
    snapshot.setReport(json.writeValueAsString(report));
    snapshots.save(snapshot);
    ProjectAudit audit = new ProjectAudit();
    audit.setProjectId(projectId);
    audit.setAction("ANALYZED");
    audit.setActor(actor);
    audit.setContributorCount(roster.size());
    audit.setAverageScore(Math.round(totalScore * 100 / roster.size()) / 100.0);
    audits.save(audit);
    events.publishEvent(new Updated(projectId));
    return roster.size();
  }

  public JsonNode report(Long projectId) {
    return snapshots.findById(projectId).map(s -> json.readTree(s.getReport())).orElse(null);
  }
}
