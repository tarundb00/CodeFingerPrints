package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.GitHubConfig;
import com.example.codeFingerPrint.entity.Project;
import com.example.codeFingerPrint.entity.ProjectAudit;
import com.example.codeFingerPrint.entity.ContributionScore;
import com.example.codeFingerPrint.dtos.response.MessageResponse;
import com.example.codeFingerPrint.repository.BugReportRepository;
import com.example.codeFingerPrint.repository.ContributionRepository;
import com.example.codeFingerPrint.repository.GitHubConfigRepository;
import com.example.codeFingerPrint.repository.ProjectRepository;
import com.example.codeFingerPrint.repository.ProjectAuditRepository;
import com.example.codeFingerPrint.repository.StudentBranchRepository;
import com.example.codeFingerPrint.repository.StudentRepository;
import com.example.codeFingerPrint.repository.TeamRepository;
import com.example.codeFingerPrint.security.UserDetailsImpl;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

  private final ProjectRepository projectRepository;
  private final GitHubConfigRepository githubConfigRepository;
  private final StudentRepository studentRepository;
  private final ContributionRepository contributionRepository;
  private final BugReportRepository bugReportRepository;
  private final StudentBranchRepository studentBranchRepository;
  private final TeamRepository teamRepository;
  private final ProjectAuditRepository projectAuditRepository;
  private final RestTemplate restTemplate = new RestTemplate();
  private static final String GH_API = "https://api.github.com";

  @Autowired
  public ProjectController(ProjectRepository projectRepository, GitHubConfigRepository githubConfigRepository,
      StudentRepository studentRepository, ContributionRepository contributionRepository,
      BugReportRepository bugReportRepository, StudentBranchRepository studentBranchRepository,
      TeamRepository teamRepository, ProjectAuditRepository projectAuditRepository) {
    this.projectRepository = projectRepository;
    this.githubConfigRepository = githubConfigRepository;
    this.studentRepository = studentRepository;
    this.contributionRepository = contributionRepository;
    this.bugReportRepository = bugReportRepository;
    this.studentBranchRepository = studentBranchRepository;
    this.teamRepository = teamRepository;
    this.projectAuditRepository = projectAuditRepository;
  }

  public ProjectController(ProjectRepository projectRepository, GitHubConfigRepository githubConfigRepository,
      StudentRepository studentRepository, ContributionRepository contributionRepository,
      BugReportRepository bugReportRepository, StudentBranchRepository studentBranchRepository,
      TeamRepository teamRepository) {
    this(projectRepository, githubConfigRepository, studentRepository, contributionRepository,
        bugReportRepository, studentBranchRepository, teamRepository, null);
  }

  @GetMapping
  public List<Project> getAll(@AuthenticationPrincipal UserDetailsImpl userDetails) {
    if (userDetails == null)
      return projectRepository.findAll();
    return projectRepository.findByTeacherId(userDetails.getId());
  }

  @GetMapping("/{id}")
  public ResponseEntity<Project> getById(@PathVariable Long id) {
    return projectRepository.findById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/{id}/finalize")
  public ResponseEntity<?> finalizeProject(@PathVariable Long id,
      @AuthenticationPrincipal UserDetailsImpl userDetails) {
    if (userDetails == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
          .body(new MessageResponse("Teacher authentication is required to finalize a project."));
    }

    return projectRepository.findById(id).map(project -> {
      if (project.getTeacherId() == null || !project.getTeacherId().equals(userDetails.getId())) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new MessageResponse("You are not allowed to finalize this project."));
      }
      project.setCompletionFinalized(true);
      project.setFinalizedBy(userDetails.getUsername());
      project.setFinalizedAt(LocalDateTime.now());
      project.setStatus("completed");
      projectRepository.save(project);
      ProjectAudit audit = new ProjectAudit();
      audit.setProjectId(project.getId());
      audit.setAction("FINALIZED");
      audit.setActor(userDetails.getUsername());
      if (projectAuditRepository != null) projectAuditRepository.save(audit);
      return ResponseEntity.ok(project);
    }).orElse(ResponseEntity.notFound().build());
  }

  @PutMapping("/{id}/publish-marks")
  public ResponseEntity<?> publishMarks(@PathVariable Long id,
      @AuthenticationPrincipal UserDetailsImpl userDetails) {
    Project project = projectRepository.findById(id).orElse(null);
    if (project == null) return ResponseEntity.notFound().build();
    if (!canManage(project, userDetails)) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
          .body(new MessageResponse("You are not allowed to publish marks for this project."));
    }
    List<ContributionScore> scores = contributionRepository.findByProjectId(id);
    scores.forEach(score -> score.setMarksPublished(true));
    contributionRepository.saveAll(scores);
    return ResponseEntity.ok(new MessageResponse("Marks published for " + scores.size() + " students."));
  }

  @GetMapping("/{id}/audits")
  public ResponseEntity<?> getAudits(@PathVariable Long id,
      @AuthenticationPrincipal UserDetailsImpl userDetails) {
    Project project = projectRepository.findById(id).orElse(null);
    if (project == null) return ResponseEntity.notFound().build();
    if (!canManage(project, userDetails)) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
          .body(new MessageResponse("You are not allowed to view this project's audit history."));
    }
    return ResponseEntity.ok(projectAuditRepository.findByProjectIdOrderByCreatedAtDesc(id));
  }

  @PostMapping
  public ResponseEntity<Project> create(@RequestBody Project project,
      @AuthenticationPrincipal UserDetailsImpl userDetails) {
    if (project.getStatus() == null)
      project.setStatus("active");
    if (userDetails != null)
      project.setTeacherId(userDetails.getId());
    return ResponseEntity.status(HttpStatus.CREATED).body(projectRepository.save(project));
  }

  @PutMapping("/{id}")
  public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Project body,
      @AuthenticationPrincipal UserDetailsImpl userDetails) {
    return projectRepository.findById(id).map(existing -> {
      if (!canManage(existing, userDetails)) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new MessageResponse("You are not allowed to update this project."));
      }
      existing.setName(body.getName());
      existing.setIcon(body.getIcon());
      existing.setDescription(body.getDescription());
      existing.setSemester(body.getSemester());
      existing.setAcademicYear(body.getAcademicYear());
      existing.setTotalMarks(body.getTotalMarks());
      existing.setStartDate(body.getStartDate());
      existing.setEndDate(body.getEndDate());
      existing.setStatus(body.getStatus());
      existing.setGithubRepoName(body.getGithubRepoName());
      existing.setGithubOwner(body.getGithubOwner());
      existing.setGithubBranch(body.getGithubBranch());
      existing.setGithubVisibility(body.getGithubVisibility());
      existing.setAiDetect(body.getAiDetect());
      existing.setReviewImpact(body.getReviewImpact());
      existing.setBugTracking(body.getBugTracking());
      existing.setGradingWeights(body.getGradingWeights());
      existing.setNotificationSettings(body.getNotificationSettings());
      existing.setAlertThreshold(body.getAlertThreshold());
      existing.setTeamId(body.getTeamId());
      return ResponseEntity.ok(projectRepository.save(existing));
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id,
      @RequestParam(required = false, defaultValue = "false") boolean deleteGithubRepo,
      @AuthenticationPrincipal UserDetailsImpl userDetails) {
    return deleteProject(id, deleteGithubRepo, userDetails, true);
  }

  // Kept for existing direct controller tests; HTTP requests always use the secured overload above.
  public ResponseEntity<?> delete(Long id, boolean deleteGithubRepo) {
    return deleteProject(id, deleteGithubRepo, null, false);
  }

  private ResponseEntity<?> deleteProject(Long id, boolean deleteGithubRepo,
      UserDetailsImpl userDetails, boolean enforceOwnership) {
    if (!projectRepository.existsById(id))
      return ResponseEntity.notFound().build();

    Project project = projectRepository.findById(id).orElse(null);
    if (project == null) {
      return ResponseEntity.notFound().build();
    }
    if (enforceOwnership && !canManage(project, userDetails)) {
      return ResponseEntity.status(HttpStatus.FORBIDDEN)
          .body(new MessageResponse("You are not allowed to delete this project."));
    }
    if (project != null && deleteGithubRepo && project.getGithubRepoName() != null
        && !project.getGithubRepoName().isBlank()) {
      GitHubConfig cfg = githubConfigRepository.findFirstByStatusOrderByIdDesc("active").orElse(null);
      if (cfg == null || cfg.getPersonalAccessToken() == null || cfg.getPersonalAccessToken().isBlank()) {
        return ResponseEntity.badRequest().body(
            new MessageResponse("Cannot delete the GitHub repository because no active GitHub config is available."));
      }

      String repoOwner = project.getGithubOwner();
      if (repoOwner == null || repoOwner.isBlank()) {
        repoOwner = cfg.getOrganizationName() != null && !cfg.getOrganizationName().isBlank()
            ? cfg.getOrganizationName()
            : "";
      }
      if (repoOwner.isBlank()) {
        return ResponseEntity.badRequest()
            .body(new MessageResponse("Cannot delete the GitHub repository because no repository owner is available."));
      }

      HttpHeaders headers = bearerHeaders(cfg.getPersonalAccessToken());
      try {
        restTemplate.exchange(GH_API + "/repos/" + repoOwner + "/" + project.getGithubRepoName(),
            HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);
      } catch (HttpClientErrorException e) {
        String message = e.getResponseBodyAsString();
        return ResponseEntity.status(e.getStatusCode()).body(new MessageResponse(
            "GitHub repository deletion failed: " + message));
      } catch (Exception e) {
        return ResponseEntity.internalServerError().body(new MessageResponse(
            "GitHub repository deletion failed: " + e.getMessage()));
      }
    }

    cleanupProjectData(project.getId(), project.getTeamId());
    if (project.getTeamId() != null) {
      List<Project> linkedProjects = projectRepository.findByTeamId(project.getTeamId());
      boolean isOnlyProjectForTeam = linkedProjects.stream()
          .filter(existing -> !existing.getId().equals(project.getId()))
          .findAny()
          .isEmpty();
      if (isOnlyProjectForTeam) {
        teamRepository.deleteById(project.getTeamId());
      }
    }

    projectRepository.deleteById(id);
    return ResponseEntity.ok(new MessageResponse("Project deleted"));
  }

  private void cleanupProjectData(Long projectId, Long teamId) {
    if (projectId != null) {
      contributionRepository.findByProjectId(projectId)
          .forEach(item -> contributionRepository.deleteById(item.getId()));
      bugReportRepository.findByProjectId(projectId).forEach(item -> bugReportRepository.deleteById(item.getId()));
      studentBranchRepository.findByProjectId(projectId)
          .forEach(item -> studentBranchRepository.deleteById(item.getId()));
    }

    if (teamId != null) {
      contributionRepository.findByTeamId(teamId).forEach(item -> contributionRepository.deleteById(item.getId()));
      bugReportRepository.findByTeamId(teamId).forEach(item -> bugReportRepository.deleteById(item.getId()));
      studentBranchRepository.findByTeamId(teamId).forEach(item -> studentBranchRepository.deleteById(item.getId()));
      studentRepository.findByTeamId(teamId).forEach(student -> {
        student.setTeamId(null);
        studentRepository.save(student);
      });
    }
  }

  private HttpHeaders bearerHeaders(String token) {
    HttpHeaders headers = new HttpHeaders();
    headers.set("Authorization", "Bearer " + token);
    headers.set("Accept", "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", "2022-11-28");
    headers.setContentType(MediaType.APPLICATION_JSON);
    return headers;
  }

  private boolean canManage(Project project, UserDetailsImpl userDetails) {
    if (project == null || userDetails == null) return false;
    boolean admin = userDetails.getAuthorities().stream()
        .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    return admin || (project.getTeacherId() != null && project.getTeacherId().equals(userDetails.getId()));
  }
}
