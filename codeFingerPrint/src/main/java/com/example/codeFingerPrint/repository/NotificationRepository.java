package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
  List<Notification> findTop50ByRecipientKeyOrderByCreatedAtDesc(String recipientKey);
  List<Notification> findByReadFalseAndRecipientKey(String recipientKey);
}
