package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
  List<Project> findByTeacherId(Long teacherId);

  List<Project> findByTeamId(Long teamId);

  boolean existsByTeamId(Long teamId);
}
