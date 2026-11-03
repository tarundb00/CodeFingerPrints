package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.AddTeacher;
import com.example.codeFingerPrint.entity.TeacherRegistrationRequest;
import com.example.codeFingerPrint.repository.AddTeacherRepository;
import com.example.codeFingerPrint.repository.TeacherRegistrationRequestRepository;
import com.example.codeFingerPrint.services.EmailService;
import com.example.codeFingerPrint.services.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher-requests")
@CrossOrigin(origins = "*")
public class TeacherRegistrationController {

  private final TeacherRegistrationRequestRepository requestRepo;
  private final AddTeacherRepository teacherRepo;
  private final NotificationService notificationService;
  private final EmailService emailService;
  private final PasswordEncoder passwordEncoder;

  public TeacherRegistrationController(
      TeacherRegistrationRequestRepository requestRepo,
      AddTeacherRepository teacherRepo,
      NotificationService notificationService,
      EmailService emailService,
      PasswordEncoder passwordEncoder) {
    this.requestRepo = requestRepo;
    this.teacherRepo = teacherRepo;
    this.notificationService = notificationService;
    this.emailService = emailService;
    this.passwordEncoder = passwordEncoder;
  }

  /** Public endpoint — any teacher can submit a registration request. */
  @PostMapping
  public ResponseEntity<?> submitRequest(@RequestBody Map<String, String> body) {
    String email = body.getOrDefault("email", "").trim().toLowerCase();
    if (email.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
    }

    // Check if already approved (active teacher)
    if (teacherRepo.existsByEmail(email)) {
      return ResponseEntity.badRequest()
          .body(Map.of("message", "An account with this email already exists."));
    }

    // Check if a pending request already exists
    if (requestRepo.existsByEmail(email)) {
      TeacherRegistrationRequest existing = requestRepo.findByEmail(email).orElse(null);
      if (existing != null && existing.getStatus() == TeacherRegistrationRequest.Status.PENDING) {
        return ResponseEntity.badRequest()
            .body(Map.of("message", "A registration request is already pending for this email."));
      }
    }

    TeacherRegistrationRequest req = new TeacherRegistrationRequest();
    req.setFirstName(body.getOrDefault("firstName", "").trim());
    req.setLastName(body.getOrDefault("lastName", "").trim());
    req.setEmail(email);
    req.setPassword(body.getOrDefault("password", "").trim()); // stored plain temporarily; hashed on approval
    req.setPhone(body.getOrDefault("phone", "").trim());
    req.setGender(body.getOrDefault("gender", "").trim());
    req.setAddress(body.getOrDefault("address", "").trim());
    req.setProfilePictureUrl(body.getOrDefault("profilePictureUrl", null));

    String dob = body.getOrDefault("dateOfBirth", "").trim();
    if (!dob.isBlank()) {
      try { req.setDateOfBirth(LocalDate.parse(dob)); } catch (DateTimeParseException ignored) {}
    }

    requestRepo.save(req);

    // Notify admin via the existing notification system
    String fullName = req.getFirstName() + " " + req.getLastName();
    notificationService.notify(
        "ADMIN",
        "TEACHER_REGISTRATION",
        "New Teacher Registration Request",
        fullName + " (" + email + ") has requested a teacher account. Please review and approve or decline."
    );

    return ResponseEntity.ok(Map.of("message", "Approval request sent successfully!"));
  }

  /** Admin-only — list all pending requests. */
  @GetMapping("/pending")
  public List<TeacherRegistrationRequest> getPendingRequests() {
    return requestRepo.findByStatusOrderByRequestedAtDesc(
        TeacherRegistrationRequest.Status.PENDING);
  }

  /** Admin-only — list all requests (all statuses). */
  @GetMapping
  public List<TeacherRegistrationRequest> getAllRequests() {
    return requestRepo.findAll();
  }

  /** Admin approves the request → create teacher account + send email. */
  @PostMapping("/{id}/approve")
  public ResponseEntity<?> approveRequest(@PathVariable Long id) {
    return requestRepo.findById(id).map(req -> {
      if (req.getStatus() != TeacherRegistrationRequest.Status.PENDING) {
        return ResponseEntity.badRequest()
            .body(Map.of("message", "Request is not in PENDING state."));
      }

      // Create the teacher account
      if (!teacherRepo.existsByEmail(req.getEmail())) {
        AddTeacher teacher = new AddTeacher();
        teacher.setFirstName(req.getFirstName());
        teacher.setLastName(req.getLastName());
        teacher.setEmail(req.getEmail());
        teacher.setPassword(passwordEncoder.encode(req.getPassword()));
        teacher.setPhone(req.getPhone());
        teacher.setDateOfBirth(req.getDateOfBirth());
        teacher.setGender(req.getGender());
        teacher.setAddress(req.getAddress());
        teacher.setProfilePictureUrl(req.getProfilePictureUrl());
        HashSet<String> roles = new HashSet<>();
        roles.add("TEACHER");
        teacher.setRoles(roles);
        teacherRepo.save(teacher);
      }

      req.setStatus(TeacherRegistrationRequest.Status.APPROVED);
      req.setProcessedAt(LocalDateTime.now());
      requestRepo.save(req);

      // Send activation email to the teacher
      try {
        emailService.send(
            req.getEmail(),
            "Your CodeFingerprints Account is Activated!",
            "Dear " + req.getFirstName() + " " + req.getLastName() + ",\n\n"
                + "Your account has been approved by the admin.\n"
                + "Your account is now activated — you can access your account at:\n"
                + "http://localhost:3000/login\n\n"
                + "Use your registered email and password to sign in.\n\n"
                + "Welcome to CodeFingerprints!\n\nRegards,\nCodeFingerprints Admin"
        );
      } catch (Exception e) {
        System.err.println("Failed to send approval email: " + e.getMessage());
      }

      return ResponseEntity.ok(Map.of("message", "Teacher account approved and email sent."));
    }).orElse(ResponseEntity.notFound().build());
  }

  /** Admin declines the request → send email. */
  @PostMapping("/{id}/decline")
  public ResponseEntity<?> declineRequest(@PathVariable Long id,
      @RequestBody(required = false) Map<String, String> body) {
    return requestRepo.findById(id).map(req -> {
      if (req.getStatus() != TeacherRegistrationRequest.Status.PENDING) {
        return ResponseEntity.badRequest()
            .body(Map.of("message", "Request is not in PENDING state."));
      }

      req.setStatus(TeacherRegistrationRequest.Status.DECLINED);
      req.setProcessedAt(LocalDateTime.now());
      requestRepo.save(req);

      String reason = (body != null && body.containsKey("reason") && !body.get("reason").isBlank())
          ? body.get("reason")
          : "Your registration request has been reviewed and declined by the admin.";

      try {
        emailService.send(
            req.getEmail(),
            "CodeFingerprints — Registration Request Declined",
            "Dear " + req.getFirstName() + " " + req.getLastName() + ",\n\n"
                + reason + "\n\n"
                + "If you believe this is a mistake, please contact your administrator.\n\n"
                + "Regards,\nCodeFingerprints Admin"
        );
      } catch (Exception e) {
        System.err.println("Failed to send decline email: " + e.getMessage());
      }

      return ResponseEntity.ok(Map.of("message", "Request declined and email sent."));
    }).orElse(ResponseEntity.notFound().build());
  }
}
