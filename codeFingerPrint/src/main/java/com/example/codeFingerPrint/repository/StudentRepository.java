package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {
  Optional<Student> findByUsn(String usn);
  Optional<Student> findByEmail(String email);
  List<Student> findByTeamId(Long teamId);
  List<Student> findByTeacherId(Long teacherId);
  boolean existsByUsn(String usn);
  boolean existsByEmail(String email);
  // Student login: match USN (used as password) + email
  Optional<Student> findByUsnAndEmail(String usn, String email);
}
