package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.dtos.response.MessageResponse;
import com.example.codeFingerPrint.entity.BugReport;
import com.example.codeFingerPrint.repository.BugReportRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bugs")
@CrossOrigin(origins = "*")
public class BugController {

  private final BugReportRepository repo;

  public BugController(BugReportRepository repo) { this.repo = repo; }

  @GetMapping("/project/{projectId}")
  public List<BugReport> byProject(@PathVariable Long projectId) {
    return repo.findByProjectId(projectId);
  }

  @GetMapping("/team/{teamId}")
  public List<BugReport> byTeam(@PathVariable Long teamId) {
    return repo.findByTeamId(teamId);
  }

  @GetMapping("/my/{usn}")
  public List<BugReport> byStudent(@PathVariable String usn) {
    return repo.findByReportedByUsn(usn.toUpperCase());
  }

  @GetMapping
  public List<BugReport> all() { return repo.findAll(); }

  @PostMapping
  public ResponseEntity<BugReport> create(@RequestBody BugReport bug) {
    if (bug.getReportedByUsn() != null)
      bug.setReportedByUsn(bug.getReportedByUsn().toUpperCase());
    return ResponseEntity.ok(repo.save(bug));
  }

  @PutMapping("/{id}")
  public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
    return repo.findById(id).map(bug -> {
      if (body.containsKey("title"))       bug.setTitle((String) body.get("title"));
      if (body.containsKey("description")) bug.setDescription((String) body.get("description"));
      if (body.containsKey("status"))      bug.setStatus((String) body.get("status"));
      if (body.containsKey("severity"))    bug.setSeverity((String) body.get("severity"));
      if (body.containsKey("type"))        bug.setType((String) body.get("type"));
      if (body.containsKey("assignedToUsn")) bug.setAssignedToUsn((String) body.get("assignedToUsn"));
      if (body.containsKey("resolution"))  bug.setResolution((String) body.get("resolution"));
      String status = (String) body.get("status");
      if ("RESOLVED".equals(status) || "CLOSED".equals(status))
        bug.setResolvedAt(LocalDateTime.now());
      return ResponseEntity.ok(repo.save(bug));
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id) {
    if (!repo.existsById(id)) return ResponseEntity.notFound().build();
    repo.deleteById(id);
    return ResponseEntity.ok(new MessageResponse("Deleted"));
  }
}
