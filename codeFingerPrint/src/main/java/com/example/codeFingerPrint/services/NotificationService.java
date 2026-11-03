package com.example.codeFingerPrint.services;

import com.example.codeFingerPrint.entity.Notification;
import com.example.codeFingerPrint.repository.NotificationRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class NotificationService {

  private final NotificationRepository repository;
  private final SimpMessagingTemplate messagingTemplate;

  public NotificationService(NotificationRepository repository, SimpMessagingTemplate messagingTemplate) {
    this.repository = repository;
    this.messagingTemplate = messagingTemplate;
  }

  public Notification notify(String recipientKey, String type, String title, String message) {
    Notification notification = new Notification();
    notification.setRecipientKey(recipientKey);
    notification.setType(type);
    notification.setTitle(title);
    notification.setMessage(message);
    Notification saved = repository.save(notification);

    Map<String, Object> payload = new HashMap<>();
    payload.put("id", saved.getId());
    payload.put("type", saved.getType());
    payload.put("title", saved.getTitle());
    payload.put("message", saved.getMessage());
    payload.put("recipientKey", saved.getRecipientKey());
    payload.put("createdAt", saved.getCreatedAt());
    messagingTemplate.convertAndSend((String) ("/topic/notifications/" + recipientKey), (Object) payload);
    messagingTemplate.convertAndSend((String) "/topic/notifications", (Object) payload);
    return saved;
  }
}
