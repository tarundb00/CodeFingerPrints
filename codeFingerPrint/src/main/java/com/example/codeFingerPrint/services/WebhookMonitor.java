package com.example.codeFingerPrint.services;

import com.example.codeFingerPrint.entity.WebhookDelivery;
import com.example.codeFingerPrint.repository.WebhookDeliveryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import java.time.Instant;

@Component
public class WebhookMonitor {
  private static final Logger log = LoggerFactory.getLogger(WebhookMonitor.class);
  private final WebhookDeliveryRepository deliveries;
  private final WebhookRefreshService refresh;
  private final SimpMessagingTemplate broker;

  public WebhookMonitor(WebhookDeliveryRepository deliveries, WebhookRefreshService refresh, SimpMessagingTemplate broker) {
    this.deliveries = deliveries;
    this.refresh = refresh;
    this.broker = broker;
  }

  @Scheduled(fixedDelayString = "${analysis.webhook.delay-ms:3000}")
  public void process() {
    deliveries.findTop50ByProcessedFalseAndNextAttemptLessThanEqualOrderByNextAttempt(Instant.now())
        .stream().map(WebhookDelivery::getProjectId).distinct().forEach(id -> {
          try { refresh.process(id); }
          catch (RuntimeException ex) {
            log.warn("Analysis refresh failed for project {}. Delivery queued for retry.", id, ex);
            refresh.retry(id);
          }
        });
  }

  @TransactionalEventListener
  public void updated(ProjectAnalysisService.Updated update) {
    broker.convertAndSend("/topic/analysis", (Object) update);
  }
}
