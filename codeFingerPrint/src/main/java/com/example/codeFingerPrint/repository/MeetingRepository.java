package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {
  List<Meeting> findByProjectIdOrderByMeetingDateDesc(Long projectId);
  List<Meeting> findByTeamIdOrderByMeetingDateDesc(Long teamId);
}