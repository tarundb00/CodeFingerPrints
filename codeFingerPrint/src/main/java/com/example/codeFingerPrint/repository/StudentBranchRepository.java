package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.StudentBranch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudentBranchRepository extends JpaRepository<StudentBranch, Long> {
  List<StudentBranch> findByProjectId(Long projectId);

  List<StudentBranch> findByTeamId(Long teamId);

  Optional<StudentBranch> findByProjectIdAndStudentId(Long projectId, Long studentId);

  Optional<StudentBranch> findByProjectIdAndStudentUsn(Long projectId, String studentUsn);

  Optional<StudentBranch> findByProjectIdAndBranchName(Long projectId, String branchName);

  Optional<StudentBranch> findByProjectIdAndPrNumber(Long projectId, Integer prNumber);

  boolean existsByProjectIdAndStudentUsn(Long projectId, String studentUsn);
}
