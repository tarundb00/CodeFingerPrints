package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.BugReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BugReportRepository extends JpaRepository<BugReport, Long> {
  List<BugReport> findByProjectId(Long projectId);
  List<BugReport> findByTeamId(Long teamId);
  List<BugReport> findByReportedByUsn(String usn);
  List<BugReport> findByStatus(String status);
}
