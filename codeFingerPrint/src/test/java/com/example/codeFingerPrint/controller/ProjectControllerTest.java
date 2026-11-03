package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.Project;
import com.example.codeFingerPrint.repository.BugReportRepository;
import com.example.codeFingerPrint.repository.ContributionRepository;
import com.example.codeFingerPrint.repository.GitHubConfigRepository;
import com.example.codeFingerPrint.repository.ProjectRepository;
import com.example.codeFingerPrint.repository.StudentBranchRepository;
import com.example.codeFingerPrint.repository.StudentRepository;
import com.example.codeFingerPrint.repository.TeamRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProjectControllerTest {

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
  void deleteRemovesLinkedTeamAndProjectRelatedData() {
    ProjectRepository projectRepository = mock(ProjectRepository.class);
    GitHubConfigRepository githubConfigRepository = mock(GitHubConfigRepository.class);
    StudentRepository studentRepository = mock(StudentRepository.class);
    ContributionRepository contributionRepository = mock(ContributionRepository.class);
    BugReportRepository bugReportRepository = mock(BugReportRepository.class);
    StudentBranchRepository studentBranchRepository = mock(StudentBranchRepository.class);
    TeamRepository teamRepository = mock(TeamRepository.class);

    Project project = new Project();
    setField(project, "id", 7L);
    project.setTeamId(11L);

    when(projectRepository.existsById(7L)).thenReturn(true);
    when(projectRepository.findById(7L)).thenReturn(Optional.of(project));
    when(projectRepository.findByTeamId(11L)).thenReturn(List.of());
    when(studentRepository.findByTeamId(11L)).thenReturn(List.of());
    when(contributionRepository.findByProjectId(7L)).thenReturn(List.of());
    when(contributionRepository.findByTeamId(11L)).thenReturn(List.of());
    when(bugReportRepository.findByProjectId(7L)).thenReturn(List.of());
    when(bugReportRepository.findByTeamId(11L)).thenReturn(List.of());
    when(studentBranchRepository.findByProjectId(7L)).thenReturn(List.of());
    when(studentBranchRepository.findByTeamId(11L)).thenReturn(List.of());

    ProjectController controller = new ProjectController(
        projectRepository,
        githubConfigRepository,
        studentRepository,
        contributionRepository,
        bugReportRepository,
        studentBranchRepository,
        teamRepository);

    ResponseEntity<?> response = controller.delete(7L, false);

    assertEquals(200, response.getStatusCode().value());
    verify(projectRepository).deleteById(7L);
    verify(teamRepository).deleteById(11L);
  }
}
