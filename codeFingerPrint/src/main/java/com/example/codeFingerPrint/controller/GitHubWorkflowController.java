package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.dtos.response.MessageResponse;
import com.example.codeFingerPrint.entity.*;
import com.example.codeFingerPrint.repository.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/github/workflow")
@CrossOrigin(origins = "*")
public class GitHubWorkflowController {

  private final GitHubConfigRepository configRepo;
  private final TeamRepository teamRepo;
  private final ProjectRepository projectRepo;
  private final StudentRepository studentRepo;
  private final StudentBranchRepository branchRepo;
  private final RestTemplate restTemplate = new RestTemplate();
  private static final String GH = "https://api.github.com";

  public GitHubWorkflowController(GitHubConfigRepository configRepo,
      TeamRepository teamRepo,
      ProjectRepository projectRepo,
      StudentRepository studentRepo,
      StudentBranchRepository branchRepo) {
    this.configRepo = configRepo;
    this.teamRepo = teamRepo;
    this.projectRepo = projectRepo;
    this.studentRepo = studentRepo;
    this.branchRepo = branchRepo;
  }

  /*
   * ─────────────────────────────────────────
   * HELPER: active config + headers
   * ─────────────────────────────────────────
   */
  private GitHubConfig activeConfig() {
    return configRepo.findFirstByStatusOrderByIdDesc("active").orElse(null);
  }

  private HttpHeaders headers(String pat) {
    HttpHeaders h = new HttpHeaders();
    h.set("Authorization", "Bearer " + pat);
    h.set("Accept", "application/vnd.github+json");
    h.set("X-GitHub-Api-Version", "2022-11-28");
    h.setContentType(MediaType.APPLICATION_JSON);
    return h;
  }

  private String repoOwner(GitHubConfig cfg, String pat) {
    String org = cfg.getOrganizationName();
    if (org != null && !org.isBlank()) {
      try {
        restTemplate.exchange(GH + "/orgs/" + org, HttpMethod.GET,
            new HttpEntity<>(headers(pat)), Map.class);
        return org;
      } catch (HttpClientErrorException e) {
        if (e.getStatusCode().value() != 404) {
          throw e;
        }
      }
    }

    Map<String, Object> user = restTemplate.exchange(
        GH + "/user", HttpMethod.GET,
        new HttpEntity<>(headers(pat)), Map.class).getBody();
    return (String) user.get("login");
  }

  private String repoOwner(GitHubConfig cfg, String pat, String preferredOwner) {
    if (preferredOwner != null && !preferredOwner.isBlank()) {
      return preferredOwner.trim();
    }
    return repoOwner(cfg, pat);
  }

  private String repoPath(GitHubConfig cfg, String repoName, String pat, String preferredOwner) {
    return repoOwner(cfg, pat, preferredOwner) + "/" + repoName;
  }

  String repoPath(GitHubConfig cfg, Project project) {
    return repoPath(cfg, project.getGithubRepoName(), cfg.getPersonalAccessToken(), project.getGithubOwner());
  }

  private boolean hasPushPermission(GitHubConfig cfg, String repoName, String pat, String githubUsername,
      String repoOwner) {
    if (githubUsername == null || githubUsername.isBlank()) {
      return false;
    }
    try {
      ResponseEntity<Map> resp = restTemplate.exchange(
          GH + "/repos/" + repoPath(cfg, repoName, pat, repoOwner) + "/collaborators/" + githubUsername
              + "/permission",
          HttpMethod.GET,
          new HttpEntity<>(headers(pat)),
          Map.class);
      Map<String, Object> body = resp.getBody();
      String permission = body != null && body.get("permission") != null ? String.valueOf(body.get("permission")) : "";
      return switch (permission.toLowerCase()) {
        case "admin", "maintain", "write" -> true;
        default -> false;
      };
    } catch (HttpClientErrorException e) {
      if (e.getStatusCode().value() == 404) {
        return false;
      }
      throw e;
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> findPendingInvitation(GitHubConfig cfg, String repoName, String pat,
      String githubUsername, String repoOwner) {
    ResponseEntity<List> response = restTemplate.exchange(
        GH + "/repos/" + repoPath(cfg, repoName, pat, repoOwner) + "/invitations?per_page=100",
        HttpMethod.GET, new HttpEntity<>(headers(pat)), List.class);
    for (Object item : response.getBody() == null ? List.of() : response.getBody()) {
      if (!(item instanceof Map)) continue;
      Map<String, Object> invitation = (Map<String, Object>) item;
      Object invitee = invitation.get("invitee");
      if (invitee instanceof Map) {
        Object login = ((Map<String, Object>) invitee).get("login");
        if (login != null && githubUsername.equalsIgnoreCase(String.valueOf(login))) {
          return invitation;
        }
      }
    }
    return null;
  }

  private void revokePendingInvitation(GitHubConfig cfg, String repoName, String pat, long invitationId,
      String repoOwner) {
    restTemplate.exchange(
        GH + "/repos/" + repoPath(cfg, repoName, pat, repoOwner) + "/invitations/" + invitationId,
        HttpMethod.DELETE, new HttpEntity<>(headers(pat)), Void.class);
  }

  static boolean branchHasNoCommits(Map<String, Object> comparison) {
    Object aheadBy = comparison.get("ahead_by");
    if (aheadBy instanceof Number number) {
      return number.intValue() <= 0;
    }
    return true;
  }

  static String normalizeGithubUsername(String githubUsername, String usn) {
    if (githubUsername != null && !githubUsername.isBlank()) {
      return githubUsername.trim();
    }
    if (usn == null || usn.isBlank()) {
      return null;
    }
    return usn.toLowerCase().replace(" ", "-");
  }

  private String resolveDefaultBranch(GitHubConfig cfg, String repoName, String pat, String preferredBranch,
      String repoOwner) {
    List<String> candidates = new ArrayList<>();
    if (preferredBranch != null && !preferredBranch.isBlank())
      candidates.add(preferredBranch);
    candidates.add("main");
    candidates.add("master");

    for (String candidate : candidates) {
      try {
        String refUrl = GH + "/repos/" + repoPath(cfg, repoName, pat, repoOwner) + "/git/ref/heads/" + candidate;
        restTemplate.exchange(refUrl, HttpMethod.GET, new HttpEntity<>(headers(pat)), Map.class);
        return candidate;
      } catch (HttpClientErrorException e) {
        if (e.getStatusCode().value() != 404) {
          throw e;
        }
      }
    }

    try {
      ResponseEntity<Map> repoResp = restTemplate.exchange(
          GH + "/repos/" + repoPath(cfg, repoName, pat, repoOwner),
          HttpMethod.GET, new HttpEntity<>(headers(pat)), Map.class);
      Map<String, Object> body = repoResp.getBody();
      if (body != null) {
        String defaultBranch = (String) body.get("default_branch");
        if (defaultBranch != null && !defaultBranch.isBlank()) {
          return defaultBranch;
        }
      }
    } catch (HttpClientErrorException e) {
      if (e.getStatusCode().value() != 404) {
        throw e;
      }
    }

    return preferredBranch != null && !preferredBranch.isBlank() ? preferredBranch : "main";
  }

  private void ensureRepositoryExists(GitHubConfig cfg, String repoName, String pat, String description,
      String visibility, String repoOwner) {
    String url = GH + "/repos/" + repoPath(cfg, repoName, pat, repoOwner);
    try {
      restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers(pat)), Map.class);
      return;
    } catch (HttpClientErrorException e) {
      if (e.getStatusCode().value() != 404) {
        throw e;
      }
    }

    boolean isPrivate = !"public".equalsIgnoreCase(visibility);
    Map<String, Object> payload = Map.of(
        "name", repoName,
        "description", description != null ? description : "",
        "private", isPrivate,
        "auto_init", true);

    restTemplate.exchange(
        GH + "/user/repos",
        HttpMethod.POST,
        new HttpEntity<>(payload, headers(pat)),
        Map.class);
  }

  /*
   * ─────────────────────────────────────────
   * 1. LIST BRANCHES
   * ─────────────────────────────────────────
   */
  @GetMapping("/branches/{projectId}")
  public ResponseEntity<?> listBranches(@PathVariable Long projectId) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));

    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null || project.getGithubRepoName() == null)
      return ResponseEntity.badRequest().body(new MessageResponse("Project or repo not found."));

    try {
      String url = GH + "/repos/" + repoPath(cfg, project)
          + "/branches?per_page=100";
      ResponseEntity<List> resp = restTemplate.exchange(url, HttpMethod.GET,
          new HttpEntity<>(headers(cfg.getPersonalAccessToken())), List.class);

      // Enrich with DB branch assignments
      List<StudentBranch> assignments = branchRepo.findByProjectId(projectId);
      Map<String, String> branchToStudent = new HashMap<>();
      for (StudentBranch sb : assignments)
        branchToStudent.put(sb.getBranchName(), sb.getStudentUsn());

      List<Map<String, Object>> result = new ArrayList<>();
      List<Map<String, Object>> ghBranches = (List<Map<String, Object>>) resp.getBody();
      if (ghBranches != null) {
        for (Map<String, Object> b : ghBranches) {
          Map<String, Object> entry = new HashMap<>(b);
          String bName = (String) b.get("name");
          entry.put("assignedTo", branchToStudent.getOrDefault(bName, null));
          entry.put("isStudentBranch", bName.startsWith("student-"));
          result.add(entry);
        }
      }
      return ResponseEntity.ok(result);
    } catch (HttpClientErrorException e) {
      int status = e.getStatusCode().value();
      if (status == 404) {
        String path = repoPath(cfg, project);
        return ResponseEntity.status(404).body(new MessageResponse(
            "Repository '" + path + "' was not found on GitHub. " +
                "Either the repo does not exist yet, the org name is wrong, or the token does not have access to that repository."));
      }
      if (status == 401 || status == 403) {
        return ResponseEntity.status(status).body(new MessageResponse(
            "GitHub authentication failed. Check that the PAT is valid and has at least 'repo' access."));
      }
      return ResponseEntity.status(500).body(new MessageResponse("GitHub error: " + e.getMessage()));
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("GitHub error: " + e.getMessage()));
    }
  }

  @PostMapping("/setup-branches/{projectId}")
  public ResponseEntity<?> setupBranches(@PathVariable Long projectId) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));

    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null || project.getGithubRepoName() == null)
      return ResponseEntity.badRequest().body(new MessageResponse("Project or repo not found."));

    Team team = project.getTeamId() != null ? teamRepo.findById(project.getTeamId()).orElse(null) : null;
    List<Student> teamStudents = team != null ? studentRepo.findByTeamId(team.getId()) : List.of();
    if (team == null || teamStudents.isEmpty())
      return ResponseEntity.badRequest().body(new MessageResponse("No team linked to project."));

    Map<String, Student> studentsByUsn = new HashMap<>();
    Map<String, Student> studentsByEmail = new HashMap<>();
    for (Student student : teamStudents) {
      if (student.getUsn() != null && !student.getUsn().isBlank()) {
        studentsByUsn.put(student.getUsn().toUpperCase(), student);
      }
      if (student.getEmail() != null && !student.getEmail().isBlank()) {
        studentsByEmail.put(student.getEmail().toLowerCase(), student);
      }
    }

    String repoName = project.getGithubRepoName();
    String pat = cfg.getPersonalAccessToken();
    HttpHeaders hdrs = headers(pat);

    String repoOwner = project.getGithubOwner();
    ensureRepositoryExists(cfg, repoName, pat, project.getDescription(), project.getGithubVisibility(), repoOwner);

    // Resolve the repository's actual default branch and get its SHA
    String defaultBranch = resolveDefaultBranch(cfg, repoName, pat, project.getGithubBranch(), repoOwner);
    String sha;
    try {
      String refUrl = GH + "/repos/" + repoPath(cfg, repoName, pat, repoOwner) + "/git/ref/heads/" + defaultBranch;
      ResponseEntity<Map> refResp = restTemplate.exchange(refUrl, HttpMethod.GET,
          new HttpEntity<>(hdrs), Map.class);
      Map<String, Object> obj = (Map<String, Object>) refResp.getBody().get("object");
      sha = (String) obj.get("sha");
    } catch (Exception e) {
      return ResponseEntity.status(500)
          .body(new MessageResponse("Cannot get branch SHA for '" + defaultBranch + "': " + e.getMessage()));
    }

    List<Map<String, Object>> created = new ArrayList<>();
    List<Map<String, Object>> skipped = new ArrayList<>();
    List<Map<String, Object>> permissionsGranted = new ArrayList<>();
    List<Map<String, Object>> permissionsResent = new ArrayList<>();
    List<Map<String, Object>> permissionsAlreadyGranted = new ArrayList<>();

    for (Student member : teamStudents) {
      Student student = null;
      if (member.getUsn() != null && !member.getUsn().isBlank()) {
        student = studentsByUsn.get(member.getUsn().toUpperCase());
      }
      if (student == null && member.getEmail() != null && !member.getEmail().isBlank()) {
        student = studentsByEmail.get(member.getEmail().toLowerCase());
      }

      String resolvedUsn = student != null && student.getUsn() != null ? student.getUsn().toUpperCase()
          : member.getUsn().toUpperCase();
      String resolvedName = student != null && student.getName() != null ? student.getName() : member.getName();
      String ghUser = student != null && student.getGithubUsername() != null && !student.getGithubUsername().isBlank()
          ? student.getGithubUsername().trim()
          : normalizeGithubUsername(member.getGithubUsername(), resolvedUsn);
      String branchName = "student-" + ghUser.toLowerCase().replace(" ", "-");
      Long studentId = student != null ? student.getId() : null;

      // Always verify collaborator permission on recheck, even if the branch already
      // exists in DB.
      if (ghUser != null && !ghUser.isBlank()) {
        if (hasPushPermission(cfg, repoName, pat, ghUser, repoOwner)) {
          Map<String, Object> p = new HashMap<>();
          p.put("usn", member.getUsn());
          p.put("username", ghUser);
          p.put("status", "already-has-access");
          permissionsAlreadyGranted.add(p);
        } else {
          try {
            Map<String, Object> pendingInvitation = findPendingInvitation(cfg, repoName, pat, ghUser, repoOwner);
            boolean resent = false;
            if (pendingInvitation != null && pendingInvitation.get("id") instanceof Number invitationId) {
              revokePendingInvitation(cfg, repoName, pat, invitationId.longValue(), repoOwner);
              resent = true;
            }
            restTemplate.exchange(
                GH + "/repos/" + repoPath(cfg, repoName, pat, repoOwner) + "/collaborators/" + ghUser,
                HttpMethod.PUT, new HttpEntity<>(Map.of("permission", "push"), hdrs), Map.class);
            Map<String, Object> p = new HashMap<>();
            p.put("usn", member.getUsn());
            p.put("username", ghUser);
            p.put("status", resent ? "invitation-resent" : "permission-granted");
            if (resent) permissionsResent.add(p);
            else permissionsGranted.add(p);
          } catch (Exception e) {
            Map<String, Object> s = new HashMap<>();
            s.put("usn", member.getUsn());
            s.put("branch", branchName);
            s.put("reason", "permission update failed: " + e.getMessage());
            skipped.add(s);
          }
        }
      }

      // Skip branch creation if already exists in DB, but permission is still checked
      // above.
      Optional<StudentBranch> existingBranch = Optional.empty();
      if (studentId != null) {
        existingBranch = branchRepo.findByProjectIdAndStudentId(projectId, studentId);
      }
      if (existingBranch.isEmpty()) {
        existingBranch = branchRepo.findByProjectIdAndStudentUsn(projectId, resolvedUsn);
      }

      if (existingBranch.isPresent()) {
        StudentBranch sb = existingBranch.get();
        sb.setStudentId(studentId);
        sb.setStudentUsn(resolvedUsn);
        sb.setStudentName(resolvedName);
        sb.setGithubUsername(ghUser);
        sb.setTeamId(team.getId());
        if (sb.getBranchName() == null || sb.getBranchName().isBlank()) {
          sb.setBranchName(branchName);
        }
        branchRepo.save(sb);
        continue;
      }

      // Create branch on GitHub
      try {
        Map<String, Object> payload = new HashMap<>();
        payload.put("ref", "refs/heads/" + branchName);
        payload.put("sha", sha);
        restTemplate.exchange(GH + "/repos/" + repoPath(cfg, repoName, pat, repoOwner) + "/git/refs",
            HttpMethod.POST, new HttpEntity<>(payload, hdrs), Map.class);
      } catch (HttpClientErrorException e) {
        if (!e.getResponseBodyAsString().contains("already exists")) {
          Map<String, Object> s = new HashMap<>();
          s.put("usn", member.getUsn());
          s.put("branch", branchName);
          s.put("reason", "GitHub error: " + e.getMessage());
          skipped.add(s);
          continue;
        }
        // branch already on GitHub — still save mapping
      } catch (Exception e) {
        Map<String, Object> s = new HashMap<>();
        s.put("usn", member.getUsn());
        s.put("branch", branchName);
        s.put("reason", e.getMessage());
        skipped.add(s);
        continue;
      }

      // Save branch mapping to DB
      StudentBranch sb = new StudentBranch();
      sb.setProjectId(projectId);
      sb.setTeamId(team.getId());
      sb.setStudentId(studentId);
      sb.setStudentUsn(resolvedUsn);
      sb.setStudentName(resolvedName);
      sb.setGithubUsername(ghUser);
      sb.setBranchName(branchName);
      sb.setStatus("active");
      branchRepo.save(sb);

      Map<String, Object> c = new HashMap<>();
      c.put("usn", resolvedUsn);
      c.put("name", resolvedName);
      c.put("branch", branchName);
      created.add(c);
    }

    Map<String, Object> result = new HashMap<>();
    result.put("created", created);
    result.put("skipped", skipped);
    result.put("permissionsGranted", permissionsGranted);
    result.put("permissionsResent", permissionsResent);
    result.put("permissionsAlreadyGranted", permissionsAlreadyGranted);
    result.put("message", "Branch setup complete. Created: " + created.size() + ", Skipped: " + skipped.size());
    return ResponseEntity.ok(result);
  }

  /*
   * ─────────────────────────────────────────
   * 3. GET BRANCH ASSIGNMENTS for a project
   * ─────────────────────────────────────────
   */
  @GetMapping("/assignments/{projectId}")
  public ResponseEntity<?> getAssignments(@PathVariable Long projectId) {
    return ResponseEntity.ok(branchRepo.findByProjectId(projectId));
  }

  /*
   * ─────────────────────────────────────────
   * 4. GET STUDENT'S ASSIGNED BRANCH
   * ─────────────────────────────────────────
   */
  @GetMapping("/my-branch/{projectId}/{usn}")
  public ResponseEntity<?> getMyBranch(@PathVariable Long projectId, @PathVariable String usn) {
    StudentBranch sb = branchRepo.findByProjectIdAndStudentUsn(projectId, usn.toUpperCase()).orElse(null);
    if (sb == null)
      return ResponseEntity.notFound().build();
    return ResponseEntity.ok(sb);
  }

  /*
   * ─────────────────────────────────────────
   * 5. FETCH COMMITS ON A BRANCH
   * ─────────────────────────────────────────
   */
  @GetMapping("/commits/{projectId}/{branch}")
  public ResponseEntity<?> getBranchCommits(@PathVariable Long projectId, @PathVariable String branch) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));
    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null)
      return ResponseEntity.notFound().build();

    try {
      String url = GH + "/repos/" + repoPath(cfg, project)
          + "/commits?sha=" + branch + "&per_page=30";
      ResponseEntity<List> resp = restTemplate.exchange(url, HttpMethod.GET,
          new HttpEntity<>(headers(cfg.getPersonalAccessToken())), List.class);
      return ResponseEntity.ok(resp.getBody());
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("Error: " + e.getMessage()));
    }
  }

  /*
   * ─────────────────────────────────────────
   * 6. COMPARE BRANCH vs MAIN (diff)
   * ─────────────────────────────────────────
   */
  @GetMapping("/compare/{projectId}/{branch}")
  public ResponseEntity<?> compareBranch(@PathVariable Long projectId, @PathVariable String branch) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));
    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null)
      return ResponseEntity.notFound().build();

    String defaultBranch = project.getGithubBranch() != null ? project.getGithubBranch() : "main";
    try {
      String url = GH + "/repos/" + repoPath(cfg, project)
          + "/compare/" + defaultBranch + "..." + branch;
      ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET,
          new HttpEntity<>(headers(cfg.getPersonalAccessToken())), Map.class);
      return ResponseEntity.ok(resp.getBody());
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("Error: " + e.getMessage()));
    }
  }

  /*
   * ─────────────────────────────────────────
   * 7. CREATE PULL REQUEST
   * ─────────────────────────────────────────
   */
  @PostMapping("/pull-request/{projectId}")
  public ResponseEntity<?> createPullRequest(@PathVariable Long projectId,
      @RequestBody Map<String, String> body) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));
    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null)
      return ResponseEntity.notFound().build();

    String branch = body.get("branch");
    String title = body.getOrDefault("title", "Merge " + branch + " into main");
    String desc = body.getOrDefault("description", "");
    String base = project.getGithubBranch() != null ? project.getGithubBranch() : "main";

    try {
      String compareUrl = GH + "/repos/" + repoPath(cfg, project)
          + "/compare/" + base + "..." + branch;
      ResponseEntity<Map> compareResp = restTemplate.exchange(compareUrl, HttpMethod.GET,
          new HttpEntity<>(headers(cfg.getPersonalAccessToken())), Map.class);
      Map<String, Object> comparison = compareResp.getBody();
      if (comparison != null && branchHasNoCommits(comparison)) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("message",
            "This branch has no commits ahead of the base branch, so no pull request can be created.");
        return ResponseEntity.badRequest().body(result);
      }
    } catch (HttpClientErrorException e) {
      if (e.getStatusCode().value() != 404) {
        return ResponseEntity.status(e.getStatusCode())
            .body(new MessageResponse("GitHub error: " + e.getResponseBodyAsString()));
      }
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("Error: " + e.getMessage()));
    }

    Map<String, Object> payload = new HashMap<>();
    payload.put("title", title);
    payload.put("body", desc);
    payload.put("head", branch);
    payload.put("base", base);

    try {
      String url = GH + "/repos/" + repoPath(cfg, project) + "/pulls";
      ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.POST,
          new HttpEntity<>(payload, headers(cfg.getPersonalAccessToken())), Map.class);

      Map<String, Object> pr = resp.getBody();
      // Update branch assignment status
      branchRepo.findByProjectIdAndBranchName(projectId, branch).ifPresent(sb -> {
        sb.setStatus("pr_open");
        sb.setPrNumber(((Number) pr.get("number")).intValue());
        sb.setPrUrl((String) pr.get("html_url"));
        branchRepo.save(sb);
      });

      Map<String, Object> result = new HashMap<>();
      result.put("success", true);
      result.put("prNumber", pr.get("number"));
      result.put("prUrl", pr.get("html_url"));
      result.put("message", "Pull request created successfully");
      return ResponseEntity.ok(result);
    } catch (HttpClientErrorException e) {
      return ResponseEntity.status(e.getStatusCode())
          .body(new MessageResponse("GitHub error: " + e.getResponseBodyAsString()));
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("Error: " + e.getMessage()));
    }
  }

  /*
   * ─────────────────────────────────────────
   * 8. LIST PULL REQUESTS
   * ─────────────────────────────────────────
   */
  @GetMapping("/pull-requests/{projectId}")
  public ResponseEntity<?> listPullRequests(@PathVariable Long projectId,
      @RequestParam(defaultValue = "open") String state) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));
    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null)
      return ResponseEntity.notFound().build();

    try {
      String url = GH + "/repos/" + repoPath(cfg, project)
          + "/pulls?state=" + state + "&per_page=50";
      ResponseEntity<List> resp = restTemplate.exchange(url, HttpMethod.GET,
          new HttpEntity<>(headers(cfg.getPersonalAccessToken())), List.class);
      return ResponseEntity.ok(resp.getBody());
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("Error: " + e.getMessage()));
    }
  }

  /*
   * ─────────────────────────────────────────
   * 9. MERGE PULL REQUEST (teacher approves)
   * ─────────────────────────────────────────
   */
  @PostMapping("/merge/{projectId}/{prNumber}")
  public ResponseEntity<?> mergePullRequest(@PathVariable Long projectId,
      @PathVariable int prNumber,
      @RequestBody(required = false) Map<String, String> body) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));
    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null)
      return ResponseEntity.notFound().build();

    String commitMsg = (body != null && body.get("commitMessage") != null)
        ? body.get("commitMessage")
        : "Merged by teacher via CodeFingerPrint";

    Map<String, Object> payload = new HashMap<>();
    payload.put("commit_title", commitMsg);
    payload.put("merge_method", "merge");

    try {
      String url = GH + "/repos/" + repoPath(cfg, project)
          + "/pulls/" + prNumber + "/merge";
      restTemplate.exchange(url, HttpMethod.PUT,
          new HttpEntity<>(payload, headers(cfg.getPersonalAccessToken())), Map.class);

      // Update branch assignment status
      branchRepo.findByProjectIdAndPrNumber(projectId, prNumber).ifPresent(sb -> {
        sb.setStatus("merged");
        branchRepo.save(sb);
      });

      Map<String, Object> result = new HashMap<>();
      result.put("success", true);
      result.put("message", "Pull request #" + prNumber + " merged successfully");
      return ResponseEntity.ok(result);
    } catch (HttpClientErrorException e) {
      String msg = e.getResponseBodyAsString();
      // Detect conflict
      if (msg.contains("conflict") || e.getStatusCode().value() == 405) {
        branchRepo.findByProjectIdAndPrNumber(projectId, prNumber).ifPresent(sb -> {
          sb.setStatus("conflict");
          branchRepo.save(sb);
        });
        return ResponseEntity.status(409).body(new MessageResponse(
            "Merge conflict detected. Manual resolution required."));
      }
      return ResponseEntity.status(e.getStatusCode()).body(new MessageResponse("GitHub error: " + msg));
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("Error: " + e.getMessage()));
    }
  }

  /*
   * ─────────────────────────────────────────
   * 10. CLOSE / REJECT PULL REQUEST
   * ─────────────────────────────────────────
   */
  @PostMapping("/reject/{projectId}/{prNumber}")
  public ResponseEntity<?> rejectPullRequest(@PathVariable Long projectId,
      @PathVariable int prNumber) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));
    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null)
      return ResponseEntity.notFound().build();

    try {
      String url = GH + "/repos/" + repoPath(cfg, project) + "/pulls/" + prNumber;
      restTemplate.exchange(url, HttpMethod.PATCH,
          new HttpEntity<>(Map.of("state", "closed"), headers(cfg.getPersonalAccessToken())), Map.class);

      branchRepo.findByProjectIdAndPrNumber(projectId, prNumber).ifPresent(sb -> {
        sb.setStatus("rejected");
        branchRepo.save(sb);
      });

      return ResponseEntity.ok(new MessageResponse("Pull request #" + prNumber + " rejected."));
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("Error: " + e.getMessage()));
    }
  }

  /*
   * ─────────────────────────────────────────
   * 11. PROTECT MAIN BRANCH
   * Prevents students from pushing to main
   * ─────────────────────────────────────────
   */
  @PostMapping("/protect-main/{projectId}")
  public ResponseEntity<?> protectMain(@PathVariable Long projectId) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));
    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null)
      return ResponseEntity.notFound().build();

    String defaultBranch = project.getGithubBranch() != null ? project.getGithubBranch() : "main";

    Map<String, Object> payload = new HashMap<>();
    payload.put("required_status_checks", null);
    payload.put("enforce_admins", false);
    Map<String, Object> prReviews = new HashMap<>();
    prReviews.put("required_approving_review_count", 1);
    payload.put("required_pull_request_reviews", prReviews);
    Map<String, Object> restrictions = new HashMap<>();
    restrictions.put("users", new ArrayList<>());
    restrictions.put("teams", new ArrayList<>());
    restrictions.put("apps", new ArrayList<>());
    payload.put("restrictions", restrictions);

    try {
      String url = GH + "/repos/" + repoPath(cfg, project)
          + "/branches/" + defaultBranch + "/protection";
      restTemplate.exchange(url, HttpMethod.PUT,
          new HttpEntity<>(payload, headers(cfg.getPersonalAccessToken())), Map.class);
      return ResponseEntity.ok(new MessageResponse("Main branch protected. Students cannot push directly."));
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("Error: " + e.getMessage()));
    }
  }

  /*
   * ─────────────────────────────────────────
   * 12. GET BRANCH DETAILS (single branch)
   * ─────────────────────────────────────────
   */
  @GetMapping("/branch-detail/{projectId}/{branch}")
  public ResponseEntity<?> getBranchDetail(@PathVariable Long projectId, @PathVariable String branch) {
    GitHubConfig cfg = activeConfig();
    if (cfg == null)
      return ResponseEntity.badRequest().body(new MessageResponse("No active GitHub config."));
    Project project = projectRepo.findById(projectId).orElse(null);
    if (project == null)
      return ResponseEntity.notFound().build();

    try {
      String url = GH + "/repos/" + repoPath(cfg, project) + "/branches/" + branch;
      ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET,
          new HttpEntity<>(headers(cfg.getPersonalAccessToken())), Map.class);
      return ResponseEntity.ok(resp.getBody());
    } catch (Exception e) {
      return ResponseEntity.status(500).body(new MessageResponse("Error: " + e.getMessage()));
    }
  }
}
