package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
  List<TeamMember> findByTeamId(Long teamId);
}
