package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.dtos.response.MessageResponse;
import com.example.codeFingerPrint.entity.Milestone;
import com.example.codeFingerPrint.repository.MilestoneRepository;
import com.example.codeFingerPrint.repository.ProjectRepository;
import com.example.codeFingerPrint.repository.AddTeacherRepository;
import com.example.codeFingerPrint.repository.StudentRepository;
import com.example.codeFingerPrint.entity.Project;
import com.example.codeFingerPrint.entity.AddTeacher;
import com.example.codeFingerPrint.entity.Student;
import com.example.codeFingerPrint.services.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/milestones")
@CrossOrigin(origins = "*")
public class MilestoneController {

  private final MilestoneRepository repo;
  private final ProjectRepository projectRepository;
  private final AddTeacherRepository teacherRepository;
  private final StudentRepository studentRepository;
  private final EmailService emailService;

  @Value("${app.hod.email:hod@college.edu}")
  private String hodEmail;

  public MilestoneController(MilestoneRepository repo,
      ProjectRepository projectRepository,
      AddTeacherRepository teacherRepository,
      StudentRepository studentRepository,
      EmailService emailService) {
    this.repo = repo;
    this.projectRepository = projectRepository;
    this.teacherRepository = teacherRepository;
    this.studentRepository = studentRepository;
    this.emailService = emailService;
  }

  @GetMapping("/team/{teamId}")
  public List<Milestone> byTeam(@PathVariable Long teamId) {
    return repo.findByTeamId(teamId);
  }

  @GetMapping("/project/{projectId}")
  public List<Milestone> byProject(@PathVariable Long projectId) {
    return repo.findByProjectId(projectId);
  }

  @PostMapping
  public ResponseEntity<Milestone> create(@RequestBody Milestone m) {
    return ResponseEntity.ok(repo.save(m));
  }

  @PutMapping("/{id}")
  public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Milestone body) {
    return repo.findById(id).map(m -> {
      m.setTitle(body.getTitle());
      m.setDueDate(body.getDueDate());
      m.setCompleted(body.getCompleted());
      m.setApproved(body.getApproved());
      m.setApprovedByUsn(body.getApprovedByUsn());
      m.setApprovedAt(body.getApprovedAt());
      if (Boolean.TRUE.equals(body.getCompleted()) && m.getCompletedAt() == null)
        m.setCompletedAt(LocalDate.now());
      if (!Boolean.TRUE.equals(body.getCompleted())) {
        m.setCompletedAt(null);
        m.setCompletedByUsn(null);
        // clearing completed also clears approval state
        m.setApproved(false);
        m.setApprovedAt(null);
        m.setApprovedByUsn(null);
      }
      if (Boolean.TRUE.equals(body.getApproved()) && m.getApprovedAt() == null)
        m.setApprovedAt(LocalDate.now());
      if (!Boolean.TRUE.equals(body.getApproved())) {
        // explicit un-approve clears approver
        m.setApprovedAt(null);
        m.setApprovedByUsn(null);
      }
      return ResponseEntity.ok(repo.save(m));
    }).orElse(ResponseEntity.notFound().build());
  }

  /** Student marks a milestone complete */
  @PostMapping("/{id}/complete")
  public ResponseEntity<?> markComplete(@PathVariable Long id, @RequestBody Map<String, String> body) {
    return repo.findById(id).map(m -> {
      m.setCompleted(true);
      m.setCompletedByUsn(body.get("usn"));
      m.setCompletedAt(LocalDate.now());
      // Student completion resets approval awaiting teacher verification
      m.setApproved(false);
      m.setApprovedByUsn(null);
      m.setApprovedAt(null);
      Milestone saved = repo.save(m);

      // Send immediate notifications: to teacher, HOD, and student confirmation
      try {
        // student info
        String usn = body.get("usn");
        Student student = usn != null ? studentRepository.findByUsn(usn.toUpperCase()).orElse(null) : null;
        String studentEmail = student != null ? student.getEmail() : null;

        // project -> teacher
        Project project = m.getProjectId() != null ? projectRepository.findById(m.getProjectId()).orElse(null) : null;
        String projectName = project != null ? project.getName() : "Project";
        String teacherEmail = null;
        if (project != null && project.getTeacherId() != null) {
          AddTeacher teacher = teacherRepository.findById(project.getTeacherId()).orElse(null);
          if (teacher != null)
            teacherEmail = teacher.getEmail();
        }

        // Email to teacher
        if (teacherEmail != null) {
          emailService.send(teacherEmail,
              "Milestone Completed by Student — " + projectName,
              "Dear Teacher,\n\nStudent " + (student != null ? student.getName() : usn) + " (USN: " + usn + ") "
                  + "has marked milestone \"" + m.getTitle()
                  + "\" as completed.\n\nPlease review and approve or reject in the teacher dashboard.\n\n— CodeFingerPrint System");
        }

        // Email to HOD
        if (hodEmail != null && !hodEmail.isBlank()) {
          emailService.send(hodEmail,
              "Milestone Completed — " + projectName,
              "Heads up,\n\nStudent " + (student != null ? student.getName() : usn) + " has completed milestone \""
                  + m.getTitle() + "\" for project: " + projectName + ".\n\n— CodeFingerPrint System");
        }

        // Confirmation to student
        if (studentEmail != null && !studentEmail.isBlank()) {
          emailService.send(studentEmail,
              "Your milestone was submitted — " + m.getTitle(),
              "Dear " + (student != null ? student.getName() : "Student")
                  + ",\n\nWe received your submission for milestone \"" + m.getTitle()
                  + "\". Your teacher will review and approve or reject it shortly.\n\n— CodeFingerPrint System");
        }
      } catch (Exception ignored) {
      }

      return ResponseEntity.ok(saved);
    }).orElse(ResponseEntity.notFound().build());
  }

  /** Student unchecks a milestone */
  @PostMapping("/{id}/uncomplete")
  public ResponseEntity<?> markUncomplete(@PathVariable Long id) {
    return repo.findById(id).map(m -> {
      m.setCompleted(false);
      m.setCompletedByUsn(null);
      m.setCompletedAt(null);
      // Clear approval when student unchecks
      m.setApproved(false);
      m.setApprovedByUsn(null);
      m.setApprovedAt(null);
      return ResponseEntity.ok(repo.save(m));
    }).orElse(ResponseEntity.notFound().build());
  }

  /** Teacher approves a student's completed milestone */
  @PostMapping("/{id}/approve")
  public ResponseEntity<?> approve(@PathVariable Long id, @RequestBody Map<String, String> body) {
    return repo.findById(id).map(m -> {
      m.setApproved(true);
      m.setApprovedByUsn(body.get("usn"));
      m.setApprovedAt(LocalDate.now());
      Milestone saved = repo.save(m);
      // notify student about approval
      try {
        String approverUsn = body.get("usn");
        String studentUsn = m.getCompletedByUsn();
        Student student = studentUsn != null ? studentRepository.findByUsn(studentUsn.toUpperCase()).orElse(null)
            : null;
        String studentEmail = student != null ? student.getEmail() : null;
        Project project = m.getProjectId() != null ? projectRepository.findById(m.getProjectId()).orElse(null) : null;
        String projectName = project != null ? project.getName() : "Project";
        if (studentEmail != null) {
          emailService.send(studentEmail,
              "Milestone Approved — " + m.getTitle(),
              "Dear " + (student != null ? student.getName() : "Student") + ",\n\nYour submission for milestone \""
                  + m.getTitle() + "\" on project \"" + projectName
                  + "\" has been APPROVED by your teacher.\n\n— CodeFingerPrint System");
        }
      } catch (Exception ignored) {
      }
      return ResponseEntity.ok(saved);
    }).orElse(ResponseEntity.notFound().build());
  }

  /** Teacher rejects a student's completed milestone (marks not approved) */
  @PostMapping("/{id}/reject")
  public ResponseEntity<?> reject(@PathVariable Long id, @RequestBody Map<String, String> body) {
    return repo.findById(id).map(m -> {
      m.setApproved(false);
      m.setApprovedByUsn(body.get("usn"));
      m.setApprovedAt(LocalDate.now());
      Milestone saved = repo.save(m);
      // notify student about rejection
      try {
        String studentUsn = m.getCompletedByUsn();
        Student student = studentUsn != null ? studentRepository.findByUsn(studentUsn.toUpperCase()).orElse(null)
            : null;
        String studentEmail = student != null ? student.getEmail() : null;
        Project project = m.getProjectId() != null ? projectRepository.findById(m.getProjectId()).orElse(null) : null;
        String projectName = project != null ? project.getName() : "Project";
        if (studentEmail != null) {
          emailService.send(studentEmail,
              "Milestone Rejected — " + m.getTitle(),
              "Dear " + (student != null ? student.getName() : "Student") + ",\n\nYour submission for milestone \""
                  + m.getTitle() + "\" on project \"" + projectName
                  + "\" has been rejected by your teacher. Please make necessary changes and resubmit.\n\n— CodeFingerPrint System");
        }
      } catch (Exception ignored) {
      }
      return ResponseEntity.ok(saved);
    }).orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<?> delete(@PathVariable Long id) {
    if (!repo.existsById(id))
      return ResponseEntity.notFound().build();
    repo.deleteById(id);
    return ResponseEntity.ok(new MessageResponse("Deleted"));
  }
}
