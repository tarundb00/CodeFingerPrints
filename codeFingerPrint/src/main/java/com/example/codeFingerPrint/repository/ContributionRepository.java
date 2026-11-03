package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.ContributionScore;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ContributionRepository extends JpaRepository<ContributionScore, Long> {
  List<ContributionScore> findByProjectId(Long projectId);
  List<ContributionScore> findByTeamId(Long teamId);
  Optional<ContributionScore> findByStudentUsnAndProjectId(String usn, Long projectId);
  List<ContributionScore> findByStatus(String status);
  List<ContributionScore> findByStatusIn(List<String> statuses);
}
