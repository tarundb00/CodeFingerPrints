package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.Project;
import com.example.codeFingerPrint.repository.ProjectRepository;
import com.example.codeFingerPrint.repository.StudentRepository;
import com.example.codeFingerPrint.services.ProjectAnalysisService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;
import java.util.*;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000", "${app.frontend.origin:http://localhost:3000}"}, allowCredentials = "true")
public class StudentReportController {
  private final ProjectAnalysisService analysis;
  private final StudentRepository students;
  private final ProjectRepository projects;

  public StudentReportController(ProjectAnalysisService analysis, StudentRepository students, ProjectRepository projects) {
    this.analysis = analysis;
    this.students = students;
    this.projects = projects;
  }

  @GetMapping("/api/students/dashboard/{usn}/report/{projectId}")
  public ResponseEntity<?> report(@PathVariable String usn, @PathVariable Long projectId, HttpServletRequest request) {
    var session = request.getSession(false);
    if (session == null || !usn.equalsIgnoreCase(String.valueOf(session.getAttribute("reportStudentUsn"))))
      return ResponseEntity.status(403).body(Map.of("message", "Sign in to your student account to open your report."));
    var student = students.findByUsn(usn.toUpperCase(Locale.ROOT)).orElse(null);
    Project project = projects.findById(projectId).orElse(null);
    if (student == null || project == null || student.getTeamId() == null || !student.getTeamId().equals(project.getTeamId()))
      return ResponseEntity.status(403).build();
    JsonNode report = analysis.report(projectId);
    if (report == null) return ResponseEntity.noContent().build();
    for (JsonNode row : report.path("contributors")) {
      if (!usn.equalsIgnoreCase(row.path("usn").asString(""))) continue;
      Set<String> paths = new HashSet<>();
      row.path("ownership").forEach(item -> paths.add(item.path("path").asString()));
      List<JsonNode> quality = new ArrayList<>();
      report.path("quality").forEach(file -> {
        if (paths.contains(file.path("path").asString())) quality.add(file);
      });
      return ResponseEntity.ok(Map.of("contributors", List.of(row), "quality", quality,
          "period_start", report.get("period_start"), "analyzed_at", report.get("analyzed_at"),
          "owner", report.get("owner"), "repo", report.get("repo"), "branch", report.get("branch")));
    }
    return ResponseEntity.noContent().build();
  }
}
