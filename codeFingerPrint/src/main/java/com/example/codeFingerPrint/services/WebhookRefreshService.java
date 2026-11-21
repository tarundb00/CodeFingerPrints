package com.example.codeFingerPrint.services;

import com.example.codeFingerPrint.entity.WebhookDelivery;
import com.example.codeFingerPrint.repository.ProjectRepository;
import com.example.codeFingerPrint.repository.WebhookDeliveryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Service
public class WebhookRefreshService {
  private final ProjectRepository projects;
  private final WebhookDeliveryRepository deliveries;
  private final ProjectAnalysisService analysis;

  public WebhookRefreshService(ProjectRepository projects, WebhookDeliveryRepository deliveries, ProjectAnalysisService analysis) {
    this.projects = projects;
    this.deliveries = deliveries;
    this.analysis = analysis;
  }

  @Transactional
  public void enqueue(Long projectId, String deliveryId) {
    deliveries.enqueue(deliveryId + "/" + projectId, projectId, Instant.now());
  }

  @Transactional
  public void process(Long projectId) {
    var project = projects.lockForAnalysis(projectId);
    var batch = deliveries.findByProjectIdAndProcessedFalseAndNextAttemptLessThanEqual(projectId, Instant.now());
    if (batch.isEmpty()) return;
    if (project.isPresent()) analysis.refresh(projectId, "GitHub webhook");
    batch.forEach(WebhookDelivery::complete);
  }

  @Transactional
  public void retry(Long projectId) {
    deliveries.findByProjectIdAndProcessedFalseAndNextAttemptLessThanEqual(projectId, Instant.now())
        .forEach(WebhookDelivery::retry);
  }
}
