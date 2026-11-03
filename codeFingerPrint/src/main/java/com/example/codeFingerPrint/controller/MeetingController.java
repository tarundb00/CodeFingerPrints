package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.Meeting;
import com.example.codeFingerPrint.repository.MeetingRepository;
import com.example.codeFingerPrint.repository.StudentRepository;
import com.example.codeFingerPrint.services.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/meetings")
@CrossOrigin(origins = "*")
public class MeetingController {
  private final MeetingRepository repository;
  private final StudentRepository studentRepository;
  private final NotificationService notificationService;

  public MeetingController(MeetingRepository repository, StudentRepository studentRepository, NotificationService notificationService) {
    this.repository = repository;
    this.studentRepository = studentRepository;
    this.notificationService = notificationService;
  }

  @GetMapping("/project/{projectId}")
  public List<Meeting> byProject(@PathVariable Long projectId) { return repository.findByProjectIdOrderByMeetingDateDesc(projectId); }

  @GetMapping("/team/{teamId}")
  public List<Meeting> byTeam(@PathVariable Long teamId) { return repository.findByTeamIdOrderByMeetingDateDesc(teamId); }

  @PostMapping
  public Meeting create(@RequestBody Meeting meeting) {
    Meeting saved = repository.save(meeting);
    notifyTeam(saved, "New offline team meeting scheduled", "A team meeting named '" + saved.getTitle() + "' is scheduled for " + saved.getMeetingDate() + ".");
    return saved;
  }

  @PutMapping("/{id}")
  public ResponseEntity<Meeting> update(@PathVariable Long id, @RequestBody Meeting input) {
    return repository.findById(id).map(existing -> {
      existing.setProjectId(input.getProjectId()); existing.setTeamId(input.getTeamId());
      existing.setTitle(input.getTitle()); existing.setMeetingDate(input.getMeetingDate());
      existing.setStatus(input.getStatus()); existing.setConductedBy(input.getConductedBy());
      existing.setDiscussionSummary(input.getDiscussionSummary()); existing.setActionItems(input.getActionItems());
      existing.setAttendanceJson(input.getAttendanceJson());
      Meeting saved = repository.save(existing);
      notifyTeam(saved, "Team meeting updated", "The meeting '" + saved.getTitle() + "' was updated. New schedule: " + saved.getMeetingDate() + ".");
      return ResponseEntity.ok(saved);
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    if (!repository.existsById(id)) return ResponseEntity.notFound().build();
    repository.deleteById(id); return ResponseEntity.noContent().build();
  }

  private void notifyTeam(Meeting meeting, String title, String message) {
    if (meeting.getTeamId() == null) return;
    studentRepository.findByTeamId(meeting.getTeamId()).forEach(student -> {
      if (student.getUsn() != null && !student.getUsn().isBlank()) {
        notificationService.notify(student.getUsn(), "MEETING", title, message);
      }
    });
  }
}