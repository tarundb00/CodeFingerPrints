package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.dtos.request.TeamRequest;
import com.example.codeFingerPrint.entity.Team;
import com.example.codeFingerPrint.repository.BugReportRepository;
import com.example.codeFingerPrint.repository.ContributionRepository;
import com.example.codeFingerPrint.repository.ProjectRepository;
import com.example.codeFingerPrint.repository.StudentBranchRepository;
import com.example.codeFingerPrint.repository.StudentRepository;
import com.example.codeFingerPrint.repository.TeamMemberRepository;
import com.example.codeFingerPrint.repository.TeamRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TeamControllerTest {

  private static void setField(Object target, String fieldName, Object value) {
    try {
      Field field = target.getClass().getDeclaredField(fieldName);
      field.setAccessible(true);
      field.set(target, value);
    } catch (ReflectiveOperationException e) {
      throw new RuntimeException(e);
    }
  }

  @Test
  void createTeamPersistsMembersFromRequest() {
    TeamRepository teamRepository = mock(TeamRepository.class);
    ProjectRepository projectRepository = mock(ProjectRepository.class);
    StudentRepository studentRepository = mock(StudentRepository.class);
    ContributionRepository contributionRepository = mock(ContributionRepository.class);
    BugReportRepository bugReportRepository = mock(BugReportRepository.class);
    StudentBranchRepository studentBranchRepository = mock(StudentBranchRepository.class);
    TeamMemberRepository teamMemberRepository = mock(TeamMemberRepository.class);

    Team team = new Team();
    setField(team, "id", 42L);
    when(teamRepository.save(any(Team.class))).thenReturn(team);
    when(studentRepository.findByTeamId(42L)).thenReturn(List.of());

    TeamRequest request = new TeamRequest();
    request.setTeamName("Alpha");
    request.setTeamNumber("1");
    request.setProjectName("Portal");
    request.setProjectType("Web Application");
    request.setDescription("desc");
    request.setMinStudents(4);
    request.setMaxStudents(6);

    TeamController controller = new TeamController(
        teamRepository,
        projectRepository,
        studentRepository,
        contributionRepository,
        bugReportRepository,
        studentBranchRepository,
        teamMemberRepository);

    ResponseEntity<?> response = controller.createTeam(request, null);

    assertEquals(201, response.getStatusCode().value());
    verify(teamRepository).save(any(Team.class));
  }
}
