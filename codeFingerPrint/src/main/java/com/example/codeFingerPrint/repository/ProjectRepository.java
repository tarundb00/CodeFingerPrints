package com.example.codeFingerPrint.repository;

import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;
import org.springframework.data.repository.query.Param;
import com.example.codeFingerPrint.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Project p where p.id = :id")
  Optional<Project> lockForAnalysis(@Param("id") Long id);

  List<Project> findByTeacherId(Long teacherId);

  List<Project> findByTeamId(Long teamId);

  boolean existsByTeamId(Long teamId);
}
