package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.dtos.response.MessageResponse;
import com.example.codeFingerPrint.entity.*;
import com.example.codeFingerPrint.repository.*;
import com.example.codeFingerPrint.security.UserDetailsImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {

  private final StudentRepository studentRepository;
  private final TeamRepository teamRepository;
  private final ProjectRepository projectRepository;
  private final ContributionRepository contributionRepository;
  private final AddTeacherRepository teacherRepository;
  private final GitHubConfigRepository githubConfigRepository;
  private final StudentBranchRepository studentBranchRepository;

  public StudentController(StudentRepository studentRepository,
      TeamRepository teamRepository,
      ProjectRepository projectRepository,
      ContributionRepository contributionRepository,
      AddTeacherRepository teacherRepository,
      GitHubConfigRepository githubConfigRepository,
      StudentBranchRepository studentBranchRepository) {
    this.studentRepository = studentRepository;
    this.teamRepository = teamRepository;
    this.projectRepository = projectRepository;
    this.contributionRepository = contributionRepository;
    this.teacherRepository = teacherRepository;
    this.githubConfigRepository = githubConfigRepository;
    this.studentBranchRepository = studentBranchRepository;
  }

  /** Get only students added by the logged-in teacher */
  @GetMapping
  public List<Student> getAll(@AuthenticationPrincipal UserDetailsImpl userDetails) {
    if (userDetails == null)
      return studentRepository.findAll();
    return studentRepository.findByTeacherId(userDetails.getId());
  }

  @GetMapping("/team/{teamId}")
  public List<Student> getByTeam(@PathVariable Long teamId) {
    return studentRepository.findByTeamId(teamId);
  }

  @GetMapping("/{id}")
  public ResponseEntity<Student> getById(@PathVariable Long id) {
    return studentRepository.findById(id)
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  @GetMapping("/usn/{usn}")
  public ResponseEntity<Student> getByUsn(@PathVariable String usn) {
    return studentRepository.findByUsn(usn.toUpperCase())
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.notFound().build());
  }

  /**
   * Student login — USN (uppercase) acts as password, matched with email.
   * No JWT needed for students; returns student record.
   */
  @PostMapping("/login")
  public ResponseEntity<?> studentLogin(@RequestBody Map<String, String> body) {
    String usn = body.getOrDefault("usn", "").toUpperCase().trim();
    String email = body.getOrDefault("email", "").trim().toLowerCase();

    if (usn.isEmpty() || email.isEmpty()) {
      return ResponseEntity.badRequest().body(new MessageResponse("USN and email are required."));
    }

    Student student = studentRepository.findByUsnAndEmail(usn, email).orElse(null);
    if (student == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
          .body(new MessageResponse("Invalid USN or email. Please check your credentials."));
    }

    Team team = resolveStudentTeam(student, usn);
    if (team != null && (student.getTeamId() == null || !Objects.equals(student.getTeamId(), team.getId()))) {
      student.setTeamId(team.getId());
      student = studentRepository.save(student);
    }

    return ResponseEntity.ok(student);
  }

  /**
   * Check if USN or email already exists — used by frontend before adding.
   */
  @GetMapping("/check")
  public ResponseEntity<Map<String, Boolean>> checkExists(
      @RequestParam(required = false) String usn,
      @RequestParam(required = false) String email) {
    Map<String, Boolean> result = new HashMap<>();
    if (usn != null)
      result.put("usnExists", studentRepository.existsByUsn(usn.toUpperCase()));
    if (email != null)
      result.put("emailExists", studentRepository.existsByEmail(email.toLowerCase()));
    return ResponseEntity.ok(result);
  }

  @PutMapping("/{id}")
  public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Student updated) {
    return studentRepository.findById(id).map(s -> {
      s.setName(updated.getName());
      s.setEmail(updated.getEmail() != null ? updated.getEmail().toLowerCase() : null);
      s.setSection(updated.getSection());
      s.setGithubUsername(updated.getGithubUsername());
      s.setRoleName(updated.getRoleName());
      s.setApproved(updated.getApproved());
      s.setTeamId(updated.getTeamId());
      return ResponseEntity.ok(studentRepository.save(s));
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id) {
    if (!studentRepository.existsById(id))
      return ResponseEntity.notFound().build();
    studentRepository.deleteById(id);
    return ResponseEntity.ok(new MessageResponse("Student deleted."));
  }

  /**
   * Full dashboard data for a student by USN.
   */
  @GetMapping("/dashboard/{usn}")
  public ResponseEntity<Map<String, Object>> getDashboard(@PathVariable String usn) {
    String normalizedUsn = usn.toUpperCase().trim();
    Student student = studentRepository.findByUsn(normalizedUsn).orElse(null);
    Map<String, Object> result = new HashMap<>();
    if (student == null)
      return ResponseEntity.ok(result);

    result.put("student", student);

    Team team = resolveStudentTeam(student, normalizedUsn);
    if (team != null && (student.getTeamId() == null || !Objects.equals(student.getTeamId(), team.getId()))) {
      student.setTeamId(team.getId());
      studentRepository.save(student);
    }
    result.put("team", attachMembers(team));

    Project project = resolveProjectForTeam(team);
    result.put("project", project);

    ContributionScore contribution = null;
    if (project != null && project.getId() != null) {
      contribution = contributionRepository
          .findByStudentUsnAndProjectId(normalizedUsn, project.getId()).orElse(null);
    }
    result.put("contribution", contribution);
    result.put("teamContributions", team != null && project != null
      ? contributionRepository.findByTeamId(team.getId()).stream()
        .filter(score -> Objects.equals(score.getProjectId(), project.getId()))
        .collect(java.util.stream.Collectors.toList())
      : List.of());

    List<Map<String, Object>> notifications = new ArrayList<>();
    if (contribution != null) {
      String msg = null;
      String type = "warning";
      if ("AT_RISK".equals(contribution.getStatus()))
        msg = "⚠️ You haven't committed in 7+ days. Please push your work.";
      else if ("INACTIVE".equals(contribution.getStatus())) {
        msg = "🚨 You are marked INACTIVE. Your teacher has been notified.";
        type = "alert";
      } else if ("NOT_CONTRIBUTING".equals(contribution.getStatus())) {
        msg = "❌ No commits found. Set your GitHub username in your profile.";
        type = "alert";
      }
      if (msg != null) {
        Map<String, Object> n = new HashMap<>();
        n.put("title", msg);
        n.put("time", "System Alert");
        n.put("type", type);
        notifications.add(n);
      }
    }
    if (project != null && project.getEndDate() != null) {
      try {
        long days = java.time.temporal.ChronoUnit.DAYS.between(
            java.time.LocalDate.now(), java.time.LocalDate.parse(project.getEndDate()));
        if (days <= 3 && days >= 0) {
          Map<String, Object> n = new HashMap<>();
          n.put("title", "📅 Project deadline in " + days + " day(s)! — " + project.getName());
          n.put("time", "Deadline Alert");
          n.put("type", "warning");
          notifications.add(n);
        }
      } catch (Exception ignored) {
      }
    }
    result.put("notifications", notifications);
    return ResponseEntity.ok(result);
  }

  /**
   * Sync team members into students table — stores teacherId from team's creator.
   * Called after team creation. teacherId passed as query param.
   */
  @PostMapping("/sync/team/{teamId}")
  public ResponseEntity<?> syncFromTeam(@PathVariable Long teamId,
      @RequestParam(required = false) Long teacherId) {
    Team team = teamRepository.findById(teamId).orElse(null);
    if (team == null)
      return ResponseEntity.notFound().build();
    int synced = syncTeamMembers(team, teacherId);
    return ResponseEntity.ok(new MessageResponse("Synced " + synced + " students."));
  }

  @PostMapping("/sync/all")
  public ResponseEntity<?> syncAll(@AuthenticationPrincipal UserDetailsImpl userDetails) {
    Long teacherId = userDetails != null ? userDetails.getId() : null;
    int total = 0;
    for (Team team : teamRepository.findAll()) {
      total += syncTeamMembers(team, teacherId);
    }
    return ResponseEntity.ok(new MessageResponse("Synced " + total + " students."));
  }

  private Team resolveStudentTeam(Student student, String usn) {
    if (student != null && student.getTeamId() != null) {
      Team team = teamRepository.findById(student.getTeamId()).orElse(null);
      if (team != null)
        return team;
    }

    return null;
  }

  private Team attachMembers(Team team) {
    if (team == null || team.getId() == null) {
      return team;
    }
    team.setMembers(studentRepository.findByTeamId(team.getId()).stream()
        .map(student -> {
          TeamMember member = new TeamMember();
          member.setUsn(student.getUsn());
          member.setName(student.getName());
          member.setEmail(student.getEmail());
          member.setSection(student.getSection());
          member.setRoleName(student.getRoleName());
          member.setApproved(student.getApproved());
          member.setGithubUsername(student.getGithubUsername());
          return member;
        })
        .collect(java.util.stream.Collectors.toList()));
    return team;
  }

  private Project resolveProjectForTeam(Team team) {
    if (team == null)
      return null;

    Project project = projectRepository.findAll().stream()
        .filter(p -> team.getId() != null && team.getId().equals(p.getTeamId()))
        .findFirst().orElse(null);

    if (project != null) {
      // For existing projects, fallback to GitHub config org name if owner is empty
      if (project.getGithubOwner() == null || project.getGithubOwner().isBlank()) {
        githubConfigRepository.findFirstByStatusOrderByIdDesc("active").ifPresent(cfg -> {
          if (cfg.getOrganizationName() != null && !cfg.getOrganizationName().isBlank()) {
            project.setGithubOwner(cfg.getOrganizationName());
          }
        });
      }
      return project;
    }

    Project fallback = new Project();
    fallback.setName(team.getProjectName() != null ? team.getProjectName() : team.getTeamName());
    fallback.setDescription(team.getDescription());
    fallback.setStartDate(null);
    fallback.setEndDate(null);
    fallback.setStatus("ACTIVE");
    fallback.setGithubRepoName(team.getGithubRepoName());
    // Use githubOwner from team, or fallback to config
    String owner = team.getGithubOwner();
    if (owner == null || owner.isBlank()) {
      owner = githubConfigRepository.findFirstByStatusOrderByIdDesc("active")
          .map(cfg -> cfg.getOrganizationName()).orElse(null);
    }
    fallback.setGithubOwner(owner);
    fallback.setGithubVisibility(team.getGithubVisibility());
    fallback.setTeamId(team.getId());
    return fallback;
  }

  private int syncTeamMembers(Team team, Long teacherId) {
    int count = 0;
    for (TeamMember m : team.getMembers()) {
      if (m.getUsn() == null || m.getUsn().isBlank())
        continue;
      String usn = m.getUsn().toUpperCase();
      String email = m.getEmail() != null ? m.getEmail().toLowerCase() : null;

      Student s = studentRepository.findByUsn(usn).orElse(null);
      if (s == null && email != null) {
        s = studentRepository.findByEmail(email).orElse(null);
      }
      if (s == null) {
        s = new Student();
      }
      s.setUsn(usn);
      s.setName(m.getName());
      s.setEmail(email);
      s.setSection(m.getSection());
      s.setGithubUsername(m.getGithubUsername());
      s.setRoleName(m.getRoleName());
      s.setApproved(m.getApproved());
      s.setTeamId(team.getId());
      if (teacherId != null)
        s.setTeacherId(teacherId);
      Student saved = studentRepository.save(s);

      projectRepository.findAll().stream()
          .filter(p -> team.getId() != null && team.getId().equals(p.getTeamId()))
          .findFirst()
          .ifPresent(project -> studentBranchRepository.findByProjectIdAndStudentUsn(project.getId(), usn)
              .ifPresent(branch -> {
                branch.setStudentId(saved.getId());
                branch.setStudentUsn(saved.getUsn());
                branch.setStudentName(saved.getName());
                branch.setGithubUsername(saved.getGithubUsername());
                branch.setTeamId(team.getId());
                studentBranchRepository.save(branch);
              }));
      count++;
    }
    return count;
  }
}
