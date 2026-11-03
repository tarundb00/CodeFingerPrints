package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.AddTeacher;
import com.example.codeFingerPrint.repository.AddTeacherRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/teachers")
@CrossOrigin(origins = "*")
public class TeacherController {

  private final AddTeacherRepository addTeacherRepository;
  private final PasswordEncoder passwordEncoder;

  @Value("${file.upload-dir}")
  private String uploadDir;

  public TeacherController(AddTeacherRepository addTeacherRepository, PasswordEncoder passwordEncoder) {
    this.addTeacherRepository = addTeacherRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @PostMapping("/upload")
  public ResponseEntity<Map<String, String>> uploadPhoto(@RequestParam("file") MultipartFile file) {
    if (file.isEmpty()) {
      return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
    }

    try {
      Path uploadPath = Paths.get(uploadDir);
      if (!Files.exists(uploadPath)) {
        Files.createDirectories(uploadPath);
      }

      String ext = "";
      String original = file.getOriginalFilename();
      if (original != null && original.contains(".")) {
        ext = original.substring(original.lastIndexOf("."));
      }
      String filename = UUID.randomUUID() + ext;

      Files.copy(file.getInputStream(), uploadPath.resolve(filename));

      String url = "/uploads/" + filename;
      return ResponseEntity.ok(Map.of("url", url));

    } catch (IOException e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(Map.of("error", "Failed to store file"));
    }
  }

  @GetMapping
  public List<AddTeacher> getAllTeachers() {
    List<AddTeacher> teachers = addTeacherRepository.findAll();
    teachers.forEach(teacher -> teacher.setPassword(null));
    return teachers;
  }

  @PostMapping
  public ResponseEntity<?> createTeacher(@RequestBody AddTeacher teacher) {
    if (addTeacherRepository.existsByEmail(teacher.getEmail())) {
      return ResponseEntity.badRequest().body(Map.of("message", "Email already registered"));
    }
    teacher.setPassword(passwordEncoder.encode(teacher.getPassword()));
    teacher.getRoles().add("ROLE_TEACHER");
    AddTeacher saved = addTeacherRepository.save(teacher);
    saved.setPassword(null);
    return ResponseEntity.status(HttpStatus.CREATED).body(saved);
  }

  @PutMapping("/{id}")
  public ResponseEntity<AddTeacher> updateTeacher(@PathVariable Long id, @RequestBody AddTeacher teacherDetails) {
    return addTeacherRepository.findById(id)
        .map(existing -> {
          existing.setFirstName(teacherDetails.getFirstName());
          existing.setLastName(teacherDetails.getLastName());
          existing.setEmail(teacherDetails.getEmail());
          existing.setPhone(teacherDetails.getPhone());
          existing.setDateOfBirth(teacherDetails.getDateOfBirth());
          existing.setGender(teacherDetails.getGender());
          existing.setAddress(teacherDetails.getAddress());
          existing.setProfilePictureUrl(teacherDetails.getProfilePictureUrl());
          if (teacherDetails.getPassword() != null && !teacherDetails.getPassword().isBlank()) {
            existing.setPassword(passwordEncoder.encode(teacherDetails.getPassword()));
          }
          AddTeacher updated = addTeacherRepository.save(existing);
          updated.setPassword(null);
          return ResponseEntity.ok(updated);
        })
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteTeacher(@PathVariable Long id) {
    if (!addTeacherRepository.existsById(id)) {
      return ResponseEntity.notFound().build();
    }
    addTeacherRepository.deleteById(id);
    return ResponseEntity.noContent().build();
  }
}
