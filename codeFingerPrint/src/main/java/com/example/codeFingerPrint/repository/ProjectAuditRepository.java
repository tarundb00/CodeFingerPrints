package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.ProjectAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectAuditRepository extends JpaRepository<ProjectAudit, Long> {
  List<ProjectAudit> findByProjectIdAndActionAndRepositoryNameIgnoreCase(Long projectId, String action, String repositoryName);
  List<ProjectAudit> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
