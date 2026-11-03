package com.example.codeFingerPrint.controller;

import com.example.codeFingerPrint.entity.Admin;
import com.example.codeFingerPrint.entity.AddTeacher;
import com.example.codeFingerPrint.dtos.request.LoginRequest;
import com.example.codeFingerPrint.dtos.request.SignUpRequest;
import com.example.codeFingerPrint.dtos.response.JwtResponse;
import com.example.codeFingerPrint.dtos.response.MessageResponse;
import com.example.codeFingerPrint.repository.AdminRepository;
import com.example.codeFingerPrint.repository.AddTeacherRepository;
import com.example.codeFingerPrint.security.JwtUtils;
import com.example.codeFingerPrint.security.UserDetailsImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@Validated
public class AuthController {

  private final AuthenticationManager authenticationManager;
  private final AdminRepository adminRepository;
  private final AddTeacherRepository addTeacherRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtUtils jwtUtils;

  public AuthController(AuthenticationManager authenticationManager,
      AdminRepository adminRepository,
      AddTeacherRepository addTeacherRepository,
      PasswordEncoder passwordEncoder,
      JwtUtils jwtUtils) {
    this.authenticationManager = authenticationManager;
    this.adminRepository = adminRepository;
    this.addTeacherRepository = addTeacherRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtUtils = jwtUtils;
  }

  @PostMapping("/login")
  public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
    try {
      Authentication authentication = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

      String jwt = jwtUtils.generateJwtToken(authentication);
      UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

      return ResponseEntity.ok(new JwtResponse(
          jwt,
          userDetails.getId(),
          userDetails.getUsername(),
          userDetails.getFirstName(),
          userDetails.getLastName(),
          userDetails.getProfilePictureUrl(),
          userDetails.getAuthorities().stream()
              .map(auth -> auth.getAuthority().replace("ROLE_", ""))
              .collect(Collectors.toList())));
    } catch (BadCredentialsException ex) {
      return ResponseEntity.badRequest().body(new MessageResponse("Invalid credentials"));
    }
  }

  @GetMapping("/me")
  public ResponseEntity<?> getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    String email = auth.getName();

    // Check admins table first
    Admin admin = adminRepository.findByEmail(email).orElse(null);
    if (admin != null) {
      return ResponseEntity.ok(Map.of(
          "id",               admin.getId(),
          "firstName",        admin.getFirstName() != null ? admin.getFirstName() : "",
          "lastName",         admin.getLastName()  != null ? admin.getLastName()  : "",
          "email",            admin.getEmail(),
          "phone",            admin.getPhone() != null ? admin.getPhone() : "",
          "profilePictureUrl",admin.getProfilePictureUrl() != null ? admin.getProfilePictureUrl() : "",
          "roles",            java.util.List.of("ADMIN")
      ));
    }

    // Fall back to teachers table
    return addTeacherRepository.findByEmail(email)
        .map(user -> ResponseEntity.ok(Map.of(
            "id",               user.getId(),
            "firstName",        user.getFirstName() != null ? user.getFirstName() : "",
            "lastName",         user.getLastName()  != null ? user.getLastName()  : "",
            "email",            user.getEmail(),
            "phone",            user.getPhone() != null ? user.getPhone() : "",
            "gender",           user.getGender() != null ? user.getGender() : "",
            "address",          user.getAddress() != null ? user.getAddress() : "",
            "profilePictureUrl",user.getProfilePictureUrl() != null ? user.getProfilePictureUrl() : "",
            "roles",            user.getRoles()
        )))
        .orElse(ResponseEntity.notFound().build());
  }

  @PutMapping("/me")
  public ResponseEntity<?> updateCurrentUser(@RequestBody Map<String, String> updates) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    String email = auth.getName();
    return addTeacherRepository.findByEmail(email)
        .map(user -> {
          if (updates.containsKey("firstName")) user.setFirstName(updates.get("firstName"));
          if (updates.containsKey("lastName"))  user.setLastName(updates.get("lastName"));
          if (updates.containsKey("phone"))     user.setPhone(updates.get("phone"));
          if (updates.containsKey("gender"))    user.setGender(updates.get("gender"));
          if (updates.containsKey("address"))   user.setAddress(updates.get("address"));
          if (updates.containsKey("profilePictureUrl")) user.setProfilePictureUrl(updates.get("profilePictureUrl"));
          if (updates.containsKey("password") && !updates.get("password").isBlank()) {
            user.setPassword(passwordEncoder.encode(updates.get("password")));
          }
          addTeacherRepository.save(user);
          return ResponseEntity.ok(new MessageResponse("Profile updated successfully"));
        })
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/register")
  public ResponseEntity<?> registerTeacher(@Valid @RequestBody SignUpRequest signUpRequest) {
    if (addTeacherRepository.existsByEmail(signUpRequest.getEmail())) {
      return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
    }

    AddTeacher addTeacher = new AddTeacher();
    addTeacher.setFirstName(signUpRequest.getFirstName());
    addTeacher.setLastName(signUpRequest.getLastName());
    addTeacher.setEmail(signUpRequest.getEmail());
    addTeacher.setPassword(passwordEncoder.encode(signUpRequest.getPassword()));
    addTeacher.setPhone(signUpRequest.getPhone());
    addTeacher.setGender(signUpRequest.getGender());
    addTeacher.setAddress(signUpRequest.getAddress());
    addTeacher.setProfilePictureUrl(signUpRequest.getProfilePictureUrl());

    if (signUpRequest.getDateOfBirth() != null && !signUpRequest.getDateOfBirth().isBlank()) {
      try {
        addTeacher.setDateOfBirth(LocalDate.parse(signUpRequest.getDateOfBirth()));
      } catch (DateTimeParseException ignored) {}
    }

    HashSet<String> roles = new HashSet<>();
    roles.add(signUpRequest.getRole() != null ? signUpRequest.getRole() : "TEACHER");
    addTeacher.setRoles(roles);

    addTeacherRepository.save(addTeacher);
    return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
  }
}
