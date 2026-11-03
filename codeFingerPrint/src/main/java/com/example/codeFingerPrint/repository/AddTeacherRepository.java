package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.AddTeacher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AddTeacherRepository extends JpaRepository<AddTeacher, Long> {
  Optional<AddTeacher> findByEmail(String email);

  boolean existsByEmail(String email);
}
