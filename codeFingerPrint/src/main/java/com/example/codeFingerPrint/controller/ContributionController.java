package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.dtos.response.MessageResponse;
import com.example.codeFingerPrint.entity.*;
import com.example.codeFingerPrint.repository.*;
import com.example.codeFingerPrint.services.PythonAnalyzerClient;
import com.example.codeFingerPrint.services.NotificationService;
import com.example.codeFingerPrint.security.UserDetailsImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/contributions")
@CrossOrigin(origins = "*")
public class ContributionController {

  private final ContributionRepository contributionRepository;
  private final ProjectRepository projectRepository;
  private final TeamRepository teamRepository;
  private final StudentRepository studentRepository;
  private final GitHubConfigRepository githubConfigRepository;
  private final ProjectAuditRepository projectAuditRepository;
  private final PythonAnalyzerClient pythonAnalyzerClient;
  private final NotificationService notificationService;

  @Autowired
  public ContributionController(ContributionRepository contributionRepository,
      ProjectRepository projectRepository,
      TeamRepository teamRepository,
      StudentRepository studentRepository,
      GitHubConfigRepository githubConfigRepository,
      PythonAnalyzerClient pythonAnalyzerClient,
      ProjectAuditRepository projectAuditRepository,
      NotificationService notificationService) {
    this.contributionRepository = contributionRepository;
    this.projectRepository = projectRepository;
    this.teamRepository = teamRepository;
    this.studentRepository = studentRepository;
    this.githubConfigRepository = githubConfigRepository;
    this.pythonAnalyzerClient = pythonAnalyzerClient;
    this.projectAuditRepository = projectAuditRepository;
    this.notificationService = notificationService;
  }

  public ContributionController(ContributionRepository contributionRepository,
      ProjectRepository projectRepository, TeamRepository teamRepository,
      StudentRepository studentRepository, GitHubConfigRepository githubConfigRepository,
      PythonAnalyzerClient pythonAnalyzerClient) {
    this(contributionRepository, projectRepository, teamRepository, studentRepository,
        githubConfigRepository, pythonAnalyzerClient, null, null);
  }

  /** Get all scores for a project */
  @GetMapping("/project/{projectId}")
  public ResponseEntity<List<ContributionScore>> getByProject(@PathVariable Long projectId) {
    return ResponseEntity.ok(contributionRepository.findByProjectId(projectId));
  }

  /** Get all scores for a team */
  @GetMapping("/team/{teamId}")
  public ResponseEntity<List<ContributionScore>> getByTeam(@PathVariable Long teamId) {
    return ResponseEntity.ok(contributionRepository.findByTeamId(teamId));
  }

  /** Get all contribution scores across all projects */
  @GetMapping("/all")
  public ResponseEntity<List<ContributionScore>> getAll() {
    return ResponseEntity.ok(contributionRepository.findAll());
  }

  /** Get all inactive/at-risk students across all projects */
  @GetMapping("/inactive")
  public ResponseEntity<List<ContributionScore>> getInactive() {
    return ResponseEntity.ok(contributionRepository.findByStatusIn(
        List.of("INACTIVE", "AT_RISK", "NOT_CONTRIBUTING")));
  }

  /** Manually update a contribution score */
  @PutMapping("/{id}")
  public ResponseEntity<?> updateContribution(@PathVariable Long id,
      @RequestBody Map<String, Object> body,
      @AuthenticationPrincipal UserDetailsImpl userDetails) {
    ContributionScore cs = contributionRepository.findById(id).orElse(null);
    if (cs == null)
      return ResponseEntity.notFound().build();
    Project project = projectRepository.findById(cs.getProjectId()).orElse(null);
    if (!canAnalyze(project, userDetails)) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
          .body(new MessageResponse("You are not allowed to update this contribution."));
    }
    if (body.containsKey("totalCommits"))
      cs.setTotalCommits(((Number) body.get("totalCommits")).intValue());
    if (body.containsKey("linesAdded"))
      cs.setLinesAdded(((Number) body.get("linesAdded")).intValue());
    if (body.containsKey("linesDeleted"))
      cs.setLinesDeleted(((Number) body.get("linesDeleted")).intValue());
    if (body.containsKey("status"))
      cs.setStatus((String) body.get("status"));
    if (body.containsKey("presentationScore"))
      cs.setPresentationScore(toNullableMark(body.get("presentationScore"), 25, "Presentation score"));
    if (body.containsKey("reportScore"))
      cs.setReportScore(toNullableMark(body.get("reportScore"), 25, "Report score"));
    if (body.containsKey("documentationScore"))
      cs.setDocumentationScore(toNullableMark(body.get("documentationScore"), 25, "Documentation score"));
    if (body.containsKey("teacherAiPenalty"))
      cs.setTeacherAiPenalty(toNullableMark(body.get("teacherAiPenalty"), 100, "AI penalty"));
    if (body.containsKey("marksPublished"))
      cs.setMarksPublished(Boolean.TRUE.equals(body.get("marksPublished")));
    if (body.containsKey("manualFeedback"))
      cs.setManualFeedback(body.get("manualFeedback") == null ? null : String.valueOf(body.get("manualFeedback")));
    return ResponseEntity.ok(contributionRepository.save(cs));
  }

  /** Delete a contribution record */
  @DeleteMapping("/{id}")
  public ResponseEntity<?> deleteContribution(@PathVariable Long id) {
    if (!contributionRepository.existsById(id))
      return ResponseEntity.notFound().build();
    contributionRepository.deleteById(id);
    return ResponseEntity.ok(new MessageResponse("Deleted"));
  }

  /**
   * Trigger project analysis through the Python analyzer service.
   * The Java backend is intentionally not calculating contribution values itself.
   */
  @PostMapping("/analyze/{projectId}")
  public ResponseEntity<?> analyzeProject(@PathVariable Long projectId,
      @AuthenticationPrincipal UserDetailsImpl userDetails) {
    Project project = projectRepository.findById(projectId).orElse(null);
    if (project == null)
      return ResponseEntity.notFound().build();

    if (!canAnalyze(project, userDetails)) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
          .body(new MessageResponse("You are not allowed to analyze this project."));
    }

    if (project.getGithubRepoName() == null || project.getGithubRepoName().isBlank())
      return ResponseEntity.badRequest().body(new MessageResponse("No GitHub repo linked to this project."));

    GitHubConfig config = githubConfigRepository.findFirstByStatusOrderByIdDesc("active").orElse(null);
    if (config == null || config.getPersonalAccessToken() == null || config.getPersonalAccessToken().isBlank())
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config with PAT found."));

    Team team = project.getTeamId() != null ? teamRepository.findById(project.getTeamId()).orElse(null) : null;
    List<Student> students = team != null ? studentRepository.findByTeamId(team.getId()) : List.of();
    if (team == null || students.isEmpty())
      return ResponseEntity.badRequest().body(new MessageResponse("No team or members linked to this project."));

    String owner = project.getGithubOwner() != null && !project.getGithubOwner().isBlank()
        ? project.getGithubOwner()
        : config.getOrganizationName();
    String repo = project.getGithubRepoName();
    String defaultBranch = project.getGithubBranch() != null && !project.getGithubBranch().isBlank()
        ? project.getGithubBranch()
        : (config.getDefaultBranch() != null ? config.getDefaultBranch() : "main");

    if (owner == null || owner.isBlank())
      return ResponseEntity.badRequest().body(new MessageResponse("GitHub owner/org not set."));

    Map<String, Object> pyResult;
    try {
      pyResult = pythonAnalyzerClient.analyzeRepo(owner, repo, defaultBranch);
    } catch (Exception e) {
      return ResponseEntity.status(502).body(new MessageResponse(
          "Python analyzer failed: " + e.getMessage()
              + ". Ensure the Python service is running at http://localhost:9000."));
    }

    if (pyResult == null || !pyResult.containsKey("contributors")) {
      return ResponseEntity.status(502).body(new MessageResponse(
          "Python analyzer returned no contributor data for this repository. Ensure the Python analyzer is running and the repo is valid."));
    }

    List<Map<String, Object>> contributors = asContributorList(pyResult.get("contributors"));
    if (contributors.isEmpty()) {
      return ResponseEntity.status(502).body(new MessageResponse(
          "Python analyzer found no contributors for this repository."));
    }

    Map<String, Map<String, Object>> contributorIndex = buildContributorIndex(contributors);
    int saved = 0;

    for (Student member : students) {
      Map<String, Object> contributor = resolvePythonContributor(member, contributorIndex);
      int commits = contributor != null ? toInt(contributor.get("commits")) : 0;
      int adds = contributor != null ? toInt(contributor.get("additions")) : 0;
      int dels = contributor != null ? toInt(contributor.get("deletions")) : 0;
      int activeDays = contributor != null ? toInt(contributor.get("active_days")) : 0;
      int pullRequests = contributor != null ? toInt(contributor.get("pull_requests")) : 0;
      double score = contributor != null ? toDouble(contributor.get("score")) : 0.0;
      String status = contributor != null && contributor.get("status") != null
          ? String.valueOf(contributor.get("status")).toUpperCase(Locale.ROOT)
          : "NOT_CONTRIBUTING";
      String lastCommitDateStr = contributor != null && contributor.get("last_commit_date") != null
          ? String.valueOf(contributor.get("last_commit_date"))
          : null;

      if (contributor == null) {
        status = "NOT_CONTRIBUTING";
      }

      LocalDateTime lastCommit = parseDate(lastCommitDateStr);
      if ("NOT_CONTRIBUTING".equals(status) || commits == 0) {
        status = "NOT_CONTRIBUTING";
      } else if (lastCommit == null) {
        status = "AT_RISK";
      } else {
        long days = ChronoUnit.DAYS.between(lastCommit, LocalDateTime.now());
        if (days > 14) {
          status = "INACTIVE";
        } else if (days > 7) {
          status = "AT_RISK";
        } else {
          status = "ACTIVE";
        }
      }

      ContributionScore cs = contributionRepository
          .findByStudentUsnAndProjectId(member.getUsn(), projectId)
          .orElse(new ContributionScore());
      cs.setStudentUsn(member.getUsn());
      cs.setStudentName(member.getName());
      cs.setStudentEmail(member.getEmail());
      cs.setProjectId(projectId);
      cs.setTeamId(team.getId());
      cs.setTotalCommits(commits);
      cs.setLinesAdded(adds);
      cs.setLinesDeleted(dels);
      cs.setActiveDays(activeDays);
      cs.setPullRequests(pullRequests);
      cs.setIssuesClosed(0);
      cs.setReviewComments(0);
      cs.setScore(score);
      cs.setStatus(status);
      cs.setLastCommitDate(lastCommit);
      contributionRepository.save(cs);
      if (notificationService != null && "NOT_CONTRIBUTING".equals(status)) {
        String alertMessage = member.getName() + " has no contribution detected in " + project.getName() + ".";
        notificationService.notify(member.getUsn(), "NOT_CONTRIBUTING", "No contribution detected", alertMessage);
        notificationService.notify("TEACHER", "NOT_CONTRIBUTING", "No contribution detected",
        member.getName() + " · " + member.getUsn() + " · " + commits + " commits · score " + score + "%");
      }
      if (notificationService != null && score < 40 && !"NOT_CONTRIBUTING".equals(status)) {
        notificationService.notify(member.getUsn(), "LOW_CONTRIBUTION", "Low contribution alert",
            "Your contribution score for " + project.getName() + " is " + score + "/100.");
        notificationService.notify("TEACHER", "LOW_CONTRIBUTION", "Low contribution alert",
            member.getName() + " · " + member.getUsn() + " · score " + score + "/100");
      }
      saved++;
    }

    double averageScore = students.isEmpty() ? 0.0 : contributionRepository.findByProjectId(projectId).stream()
      .mapToDouble(item -> item.getScore() == null ? 0.0 : item.getScore())
      .average().orElse(0.0);
    ProjectAudit audit = new ProjectAudit();
    audit.setProjectId(projectId);
    audit.setAction("ANALYZED");
    audit.setActor(userDetails.getUsername());
    audit.setContributorCount(saved);
    audit.setAverageScore(Math.round(averageScore * 100.0) / 100.0);
    if (projectAuditRepository != null) projectAuditRepository.save(audit);

    return ResponseEntity.ok(new MessageResponse(
      "Analysis complete (python). Processed " + saved + " students."));
  }

  private List<Map<String, Object>> asContributorList(Object value) {
    if (value instanceof List<?> list) {
      List<Map<String, Object>> results = new ArrayList<>();
      for (Object item : list) {
        if (item instanceof Map<?, ?> map) {
          Map<String, Object> converted = new HashMap<>();
          for (Map.Entry<?, ?> entry : map.entrySet()) {
            converted.put(String.valueOf(entry.getKey()), entry.getValue());
          }
          results.add(converted);
        }
      }
      return results;
    }
    return List.of();
  }

  private Map<String, Map<String, Object>> buildContributorIndex(List<Map<String, Object>> contributors) {
    Map<String, Map<String, Object>> index = new HashMap<>();
    for (Map<String, Object> contributor : contributors) {
      String author = contributor.get("author") != null ? String.valueOf(contributor.get("author")).trim() : "";
      if (!author.isBlank()) {
        index.put(normalizeKey(author), contributor);
      }
      Object email = contributor.get("email");
      if (email != null) {
        index.put(normalizeKey(String.valueOf(email)), contributor);
      }
      Object gitName = contributor.get("gitName");
      if (gitName != null) {
        index.put(normalizeKey(String.valueOf(gitName)), contributor);
      }
    }
    return index;
  }

  private Map<String, Object> resolvePythonContributor(Student member, Map<String, Map<String, Object>> index) {
    String githubUsername = member.getGithubUsername();
    String name = member.getName();
    String email = member.getEmail();
    String usn = member.getUsn();

    if (githubUsername != null && !githubUsername.isBlank()) {
      Map<String, Object> match = index.get(normalizeKey(githubUsername));
      if (match != null)
        return match;
    }
    if (email != null && !email.isBlank()) {
      Map<String, Object> match = index.get(normalizeKey(email));
      if (match != null)
        return match;
    }
    if (name != null && !name.isBlank()) {
      Map<String, Object> match = index.get(normalizeKey(name));
      if (match != null)
        return match;
    }
    if (usn != null && !usn.isBlank()) {
      Map<String, Object> match = index.get(normalizeKey(usn));
      if (match != null)
        return match;
    }
    return null;
  }

  private boolean canAnalyze(Project project, UserDetailsImpl userDetails) {
    if (project == null || userDetails == null) return false;
    boolean admin = userDetails.getAuthorities().stream()
        .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    return admin || (project.getTeacherId() != null && project.getTeacherId().equals(userDetails.getId()));
  }

  private Integer toNullableMark(Object value, int max, String label) {
    if (value == null || String.valueOf(value).isBlank()) return null;
    int mark = toInt(value);
    if (mark < 0 || mark > max) {
      throw new IllegalArgumentException(label + " must be between 0 and " + max + ".");
    }
    return mark;
  }

  private String normalizeKey(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private int toInt(Object value) {
    if (value == null)
      return 0;
    if (value instanceof Number n)
      return n.intValue();
    try {
      return Integer.parseInt(String.valueOf(value));
    } catch (Exception e) {
      return 0;
    }
  }

  private double toDouble(Object value) {
    if (value == null)
      return 0.0;
    if (value instanceof Number n)
      return n.doubleValue();
    try {
      return Double.parseDouble(String.valueOf(value));
    } catch (Exception e) {
      return 0.0;
    }
  }

  private LocalDateTime parseDate(String s) {
    if (s == null || s.isBlank())
      return null;
    try {
      return java.time.OffsetDateTime.parse(s).toLocalDateTime();
    } catch (Exception e1) {
      try {
        return LocalDateTime.parse(s.replace("Z", ""));
      } catch (Exception e2) {
        return null;
      }
    }
  }
}
