package com.example.codeFingerPrint.repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import com.example.codeFingerPrint.entity.WebhookDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;

public interface WebhookDeliveryRepository extends JpaRepository<WebhookDelivery, String> {
  @Modifying
  @Query(value = """
      INSERT INTO webhook_delivery (id, project_id, processed, attempts, next_attempt)
      VALUES (:id, :projectId, false, 0, :now) ON DUPLICATE KEY UPDATE id = id
      """, nativeQuery = true)
  void enqueue(String id, Long projectId, Instant now);

  List<WebhookDelivery> findTop50ByProcessedFalseAndNextAttemptLessThanEqualOrderByNextAttempt(Instant now);
  List<WebhookDelivery> findByProjectIdAndProcessedFalseAndNextAttemptLessThanEqual(Long id, Instant now);
}
