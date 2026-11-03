package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.Project;
import com.example.codeFingerPrint.entity.Team;
import com.example.codeFingerPrint.entity.TeamMember;
import com.example.codeFingerPrint.entity.Student;
import com.example.codeFingerPrint.dtos.request.MemberRequest;
import com.example.codeFingerPrint.dtos.request.TeamRequest;
import com.example.codeFingerPrint.dtos.response.MessageResponse;
import com.example.codeFingerPrint.repository.BugReportRepository;
import com.example.codeFingerPrint.repository.ContributionRepository;
import com.example.codeFingerPrint.repository.ProjectRepository;
import com.example.codeFingerPrint.repository.StudentBranchRepository;
import com.example.codeFingerPrint.repository.StudentRepository;
import com.example.codeFingerPrint.repository.TeamMemberRepository;
import com.example.codeFingerPrint.repository.TeamRepository;
import com.example.codeFingerPrint.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/teams")
@CrossOrigin(origins = "*")
public class TeamController {

  private final TeamRepository teamRepository;
  private final ProjectRepository projectRepository;
  private final StudentRepository studentRepository;
  private final ContributionRepository contributionRepository;
  private final BugReportRepository bugReportRepository;
  private final StudentBranchRepository studentBranchRepository;
  private final TeamMemberRepository teamMemberRepository;

  public TeamController(TeamRepository teamRepository, ProjectRepository projectRepository,
      StudentRepository studentRepository, ContributionRepository contributionRepository,
      BugReportRepository bugReportRepository, StudentBranchRepository studentBranchRepository,
      TeamMemberRepository teamMemberRepository) {
    this.teamRepository = teamRepository;
    this.projectRepository = projectRepository;
    this.studentRepository = studentRepository;
    this.contributionRepository = contributionRepository;
    this.bugReportRepository = bugReportRepository;
    this.studentBranchRepository = studentBranchRepository;
    this.teamMemberRepository = teamMemberRepository;
  }

  @GetMapping
  public List<Team> getAllTeams(@AuthenticationPrincipal UserDetailsImpl userDetails) {
    List<Team> teams;
    if (userDetails == null) {
      teams = teamRepository.findAll();
    } else {
      // Include teams owned by this teacher AND teams with no teacher assigned
      teams = teamRepository.findAll().stream()
          .filter(t -> t.getTeacherId() == null || t.getTeacherId().equals(userDetails.getId()))
          .collect(java.util.stream.Collectors.toList());
    }
    teams.forEach(this::attachMembersFromStudents);
    return teams;
  }

  @GetMapping("/{id}")
  public ResponseEntity<Team> getTeamById(@PathVariable Long id) {
    return teamRepository.findById(id)
        .map(team -> ResponseEntity.ok(attachMembersFromStudents(team)))
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping
  public ResponseEntity<?> createTeam(@Valid @RequestBody TeamRequest req,
      @AuthenticationPrincipal UserDetailsImpl userDetails) {
    Team team = buildTeam(new Team(), req);
    if (userDetails != null) {
      team.setTeacherId(userDetails.getId());
    }
    Team saved = teamRepository.save(team);
    syncStudentsForTeam(saved.getId(), req, saved.getTeacherId());
    return ResponseEntity.status(HttpStatus.CREATED).body(attachMembersFromStudents(saved));
  }

  @PutMapping("/{id}")
  public ResponseEntity<?> updateTeam(@PathVariable Long id, @Valid @RequestBody TeamRequest req) {
    return teamRepository.findById(id)
        .map(existing -> {
          buildTeam(existing, req);
          Team saved = teamRepository.save(existing);
          syncStudentsForTeam(saved.getId(), req, saved.getTeacherId());
          return ResponseEntity.ok(attachMembersFromStudents(saved));
        })
        .orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> deleteTeam(@PathVariable Long id) {
    if (!teamRepository.existsById(id)) {
      return ResponseEntity.notFound().build();
    }

    List<Project> linkedProjects = projectRepository.findByTeamId(id);
    for (Project project : linkedProjects) {
      cleanupProjectData(project.getId(), id);
      projectRepository.deleteById(project.getId());
    }

    cleanupTeamData(id);
    teamRepository.deleteById(id);
    return ResponseEntity.ok(new MessageResponse("Team deleted successfully."));
  }

  /* ── helpers ── */
  private Team buildTeam(Team team, TeamRequest req) {
    team.setTeamName(req.getTeamName());
    team.setTeamNumber(req.getTeamNumber());
    team.setProjectName(req.getProjectName());
    team.setProjectType(req.getProjectType());
    team.setDescription(req.getDescription());
    team.setMinStudents(req.getMinStudents());
    team.setMaxStudents(req.getMaxStudents());
    team.setTeamLeadUsn(req.getTeamLeadUsn());
    team.setGithubRepoName(req.getGithubRepoName());
    team.setGithubOwner(req.getGithubOwner());
    team.setGithubVisibility(req.getGithubVisibility());
    team.setGithubDescription(req.getGithubDescription());
    team.setGithubCollaborators(req.getGithubCollaborators());
    return team;
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
      teamMemberRepository.findByTeamId(teamId).forEach(member -> teamMemberRepository.deleteById(member.getId()));
      studentRepository.findByTeamId(teamId).forEach(student -> {
        student.setTeamId(null);
        studentRepository.save(student);
      });
    }
  }

  private void cleanupTeamData(Long teamId) {
    if (teamId == null) {
      return;
    }
    contributionRepository.findByTeamId(teamId).forEach(item -> contributionRepository.deleteById(item.getId()));
    bugReportRepository.findByTeamId(teamId).forEach(item -> bugReportRepository.deleteById(item.getId()));
    studentBranchRepository.findByTeamId(teamId).forEach(item -> studentBranchRepository.deleteById(item.getId()));
    teamMemberRepository.findByTeamId(teamId).forEach(member -> teamMemberRepository.deleteById(member.getId()));
    studentRepository.findByTeamId(teamId).forEach(student -> {
      student.setTeamId(null);
      studentRepository.save(student);
    });
  }

  private Team attachMembersFromStudents(Team team) {
    if (team == null || team.getId() == null) {
      return team;
    }
    team.setMembers(studentRepository.findByTeamId(team.getId()).stream()
        .map(this::toTeamMember)
        .collect(Collectors.toList()));
    return team;
  }

  private void syncStudentsForTeam(Long teamId, TeamRequest req, Long teacherId) {
    if (teamId == null) {
      return;
    }

    Set<String> incomingUsns = new HashSet<>();
    if (req.getMembers() != null) {
      for (MemberRequest member : req.getMembers()) {
        if (member.getUsn() != null && !member.getUsn().isBlank()) {
          incomingUsns.add(member.getUsn().toUpperCase());
        }
      }
    }

    for (Student existing : studentRepository.findByTeamId(teamId)) {
      if (existing.getUsn() != null && !incomingUsns.contains(existing.getUsn().toUpperCase())) {
        existing.setTeamId(null);
        studentRepository.save(existing);
      }
    }

    if (req.getMembers() == null) {
      return;
    }

    for (MemberRequest member : req.getMembers()) {
      if (member.getUsn() == null || member.getUsn().isBlank()) {
        continue;
      }
      String usn = member.getUsn().toUpperCase();
      Student student = studentRepository.findByUsn(usn).orElseGet(Student::new);
      student.setUsn(usn);
      student.setName(member.getName());
      student.setEmail(member.getEmail() != null ? member.getEmail().toLowerCase() : null);
      student.setSection(member.getSection());
      student.setGithubUsername(member.getGithubUsername());
      student.setRoleName(member.getRoleName());
      student.setApproved(Boolean.TRUE.equals(member.getApproved()));
      student.setTeamId(teamId);
      if (teacherId != null) {
        student.setTeacherId(teacherId);
      }
      studentRepository.save(student);
    }
  }

  private TeamMember toTeamMember(Student student) {
    TeamMember member = new TeamMember();
    member.setUsn(student.getUsn());
    member.setName(student.getName());
    member.setEmail(student.getEmail());
    member.setSection(student.getSection());
    member.setRoleName(student.getRoleName());
    member.setApproved(student.getApproved());
    member.setGithubUsername(student.getGithubUsername());
    return member;
  }

}
