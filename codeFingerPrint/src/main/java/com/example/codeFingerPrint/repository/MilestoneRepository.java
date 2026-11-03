package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.Milestone;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {
  List<Milestone> findByTeamId(Long teamId);
  List<Milestone> findByProjectId(Long projectId);
}
