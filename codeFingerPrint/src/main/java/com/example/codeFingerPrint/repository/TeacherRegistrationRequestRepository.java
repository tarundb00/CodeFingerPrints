package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.TeacherRegistrationRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeacherRegistrationRequestRepository
    extends JpaRepository<TeacherRegistrationRequest, Long> {

  List<TeacherRegistrationRequest> findByStatusOrderByRequestedAtDesc(
      TeacherRegistrationRequest.Status status);

  Optional<TeacherRegistrationRequest> findByEmail(String email);

  boolean existsByEmail(String email);
}
