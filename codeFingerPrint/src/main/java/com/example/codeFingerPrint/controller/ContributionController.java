package com.example.codeFingerPrint.controller;

import org.springframework.web.server.ResponseStatusException;
import com.example.codeFingerPrint.dtos.response.MessageResponse;
import com.example.codeFingerPrint.entity.*;
import com.example.codeFingerPrint.repository.*;
import com.example.codeFingerPrint.services.ProjectAnalysisService;
import com.example.codeFingerPrint.security.UserDetailsImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/contributions")
@CrossOrigin(origins = "*")
public class ContributionController {

  private final ContributionRepository contributionRepository;
  private final ProjectRepository projectRepository;
  private final ProjectAnalysisService analysis;

  public ContributionController(ContributionRepository contributionRepository, ProjectRepository projectRepository,
      ProjectAnalysisService analysis) {
    this.contributionRepository = contributionRepository;
    this.projectRepository = projectRepository;
    this.analysis = analysis;
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

    try {
      int saved = analysis.refresh(projectId, userDetails.getUsername());
      return ResponseEntity.ok(new MessageResponse("Analysis complete. Processed " + saved + " students."));
    } catch (ResponseStatusException ex) {
      return ResponseEntity.status(ex.getStatusCode()).body(new MessageResponse(ex.getReason()));
    }
  }

  @GetMapping("/project/{projectId}/report")
  public ResponseEntity<?> getReport(@PathVariable Long projectId, @AuthenticationPrincipal UserDetailsImpl user) {
    Project project = projectRepository.findById(projectId).orElse(null);
    if (!canAnalyze(project, user)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    var report = analysis.report(projectId);
    return report == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(report);
  }

  static boolean canAnalyze(Project project, UserDetailsImpl userDetails) {
    if (project == null || userDetails == null) return false;
    boolean admin = userDetails.getAuthorities().stream()
        .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    boolean teacher = userDetails.getAuthorities().stream()
        .anyMatch(authority -> "ROLE_TEACHER".equals(authority.getAuthority()));
    return admin || (teacher && Objects.equals(project.getTeacherId(), userDetails.getId()));
  }

  private Integer toNullableMark(Object value, int max, String label) {
    if (value == null || String.valueOf(value).isBlank()) return null;
    int mark = toInt(value);
    if (mark < 0 || mark > max) {
      throw new IllegalArgumentException(label + " must be between 0 and " + max + ".");
    }
    return mark;
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

}
