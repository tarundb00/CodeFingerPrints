package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {
  List<Team> findByTeacherId(Long teacherId);
}
