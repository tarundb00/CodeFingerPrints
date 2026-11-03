package com.example.codeFingerPrint.services;

import com.example.codeFingerPrint.entity.ContributionScore;
import com.example.codeFingerPrint.entity.Project;
import com.example.codeFingerPrint.repository.ContributionRepository;
import com.example.codeFingerPrint.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class NotificationScheduler {

  private final ContributionRepository contributionRepository;
  private final ProjectRepository projectRepository;
  private final EmailService emailService;
  private final NotificationService notificationService;

  @Value("${app.teacher.email:teacher@college.edu}")
  private String teacherEmail;

  @Value("${app.hod.email:hod@college.edu}")
  private String hodEmail;

  public NotificationScheduler(ContributionRepository contributionRepository,
      ProjectRepository projectRepository,
      EmailService emailService,
      NotificationService notificationService) {
    this.contributionRepository = contributionRepository;
    this.projectRepository = projectRepository;
    this.emailService = emailService;
    this.notificationService = notificationService;
  }

  /**
   * Runs every day at 8:00 AM.
   * Checks all contribution scores and sends alerts based on inactivity.
   */
  @Scheduled(cron = "0 0 8 * * *")
  public void checkInactiveStudents() {
    List<ContributionScore> scores = contributionRepository.findAll();
    LocalDateTime now = LocalDateTime.now();

    for (ContributionScore cs : scores) {
      long daysSinceCommit = cs.getLastCommitDate() != null
          ? ChronoUnit.DAYS.between(cs.getLastCommitDate(), now)
          : 999;

      Project project = projectRepository.findById(cs.getProjectId()).orElse(null);
      String projectName = project != null ? project.getName() : "Unknown Project";
      String deadline = project != null && project.getEndDate() != null ? project.getEndDate() : "N/A";
      String studentKey = cs.getStudentUsn();
      String studentName = cs.getStudentName() != null ? cs.getStudentName() : studentKey;

      if (cs.getScore() != null && cs.getScore() < 40) {
        notificationService.notify(studentKey, "LOW_CONTRIBUTION", "Low contribution alert",
            "Your contribution score for " + projectName + " is " + cs.getScore() + "/100. Please contribute more work.");
        notificationService.notify("TEACHER", "LOW_CONTRIBUTION", "Low contribution alert",
            studentName + " (" + studentKey + ") has a contribution score of " + cs.getScore() + "/100.");
      }

      if (cs.getStudentEmail() == null || cs.getStudentEmail().isBlank()) {
        if (daysSinceCommit < 7) continue;
      }

      // 7+ days → alert student
      if (daysSinceCommit >= 7 && daysSinceCommit < 14) {
        notificationService.notify(cs.getStudentUsn(), "INACTIVE_STUDENT", "Contribution reminder",
            "You have not committed to " + projectName + " in " + daysSinceCommit + " days.");
        if (cs.getStudentEmail() != null && !cs.getStudentEmail().isBlank()) emailService.send(
          cs.getStudentEmail(),
            "⚠️ Contribution Alert — " + projectName,
            "Dear " + cs.getStudentName() + ",\n\n"
                + "You have not made any commits in the last " + daysSinceCommit + " days on project: " + projectName + ".\n"
                + "Project deadline: " + deadline + "\n\n"
                + "Please contribute to your team's repository to avoid being marked inactive.\n\n"
                + "— CodeFingerPrint System"
        );
      }

      // 14+ days → alert teacher
      if (daysSinceCommit >= 14 && daysSinceCommit < 21) {
        notificationService.notify("TEACHER", "INACTIVE_STUDENT", "Student needs attention",
            cs.getStudentName() + " has not contributed to " + projectName + " in " + daysSinceCommit + " days.");
        if (teacherEmail != null && !teacherEmail.isBlank()) emailService.send(
          teacherEmail,
            "🚨 Student Inactive — " + cs.getStudentName(),
            "Dear Teacher,\n\n"
                + "Student " + cs.getStudentName() + " (USN: " + cs.getStudentUsn() + ") "
                + "has not contributed in " + daysSinceCommit + " days on project: " + projectName + ".\n"
                + "Project deadline: " + deadline + "\n\n"
                + "Please follow up with this student.\n\n"
                + "— CodeFingerPrint System"
        );
      }

      // 21+ days → alert HOD
      if (daysSinceCommit >= 21) {
        notificationService.notify("HOD", "INACTIVE_STUDENT", "Critical contribution alert",
            cs.getStudentName() + " has made no contribution to " + projectName + " in " + daysSinceCommit + " days.");
        if (hodEmail != null && !hodEmail.isBlank()) emailService.send(
          hodEmail,
            "🔴 Critical: Student Not Contributing — " + cs.getStudentName(),
            "Dear HOD,\n\n"
                + "CRITICAL ALERT: Student " + cs.getStudentName() + " (USN: " + cs.getStudentUsn() + ") "
                + "has made ZERO contributions in " + daysSinceCommit + " days on project: " + projectName + ".\n"
                + "Project deadline: " + deadline + "\n"
                + "Current score: " + cs.getScore() + "/100\n\n"
                + "Immediate action required.\n\n"
                + "— CodeFingerPrint System"
        );
      }

      // Deadline approaching (3 days) → alert all team members
      if (project != null && project.getEndDate() != null) {
        try {
          java.time.LocalDate endDate = java.time.LocalDate.parse(project.getEndDate());
          long daysToDeadline = ChronoUnit.DAYS.between(java.time.LocalDate.now(), endDate);
          if (daysToDeadline == 3) {
            notificationService.notify(cs.getStudentUsn(), "DEADLINE", "Project deadline reminder",
                projectName + " is due in 3 days.");
            emailService.send(
                cs.getStudentEmail(),
                "📅 Deadline Reminder — " + projectName,
                "Dear " + cs.getStudentName() + ",\n\n"
                    + "Your project \"" + projectName + "\" deadline is in 3 days (" + deadline + ").\n"
                    + "Your current contribution score: " + cs.getScore() + "/100\n\n"
                    + "Make sure all your work is committed.\n\n"
                    + "— CodeFingerPrint System"
            );
          }
        } catch (Exception ignored) {}
      }
    }
  }

  /**
   * Runs every day at 9:00 AM.
   * Checks projects nearing deadline and alerts teacher + HOD.
   */
  @Scheduled(cron = "0 0 9 * * *")
  public void checkProjectDeadlines() {
    List<Project> projects = projectRepository.findAll();
    for (Project project : projects) {
      if (project.getEndDate() == null || "archived".equals(project.getStatus())) continue;
      try {
        java.time.LocalDate endDate = java.time.LocalDate.parse(project.getEndDate());
        long daysLeft = ChronoUnit.DAYS.between(java.time.LocalDate.now(), endDate);

        if (daysLeft == 1) {
          notificationService.notify("TEACHER", "DEADLINE", "Project deadline tomorrow",
            project.getName() + " is due tomorrow.");
          notificationService.notify("HOD", "DEADLINE", "Project deadline tomorrow",
            project.getName() + " is due tomorrow.");
          emailService.send(teacherEmail,
              "🚨 Project Deadline Tomorrow — " + project.getName(),
              "Project \"" + project.getName() + "\" deadline is TOMORROW (" + project.getEndDate() + ").\n"
                  + "Status: " + project.getStatus() + "\n\n— CodeFingerPrint System");
          emailService.send(hodEmail,
              "🚨 Project Deadline Tomorrow — " + project.getName(),
              "Project \"" + project.getName() + "\" deadline is TOMORROW (" + project.getEndDate() + ").\n"
                  + "Status: " + project.getStatus() + "\n\n— CodeFingerPrint System");
        }
      } catch (Exception ignored) {}
    }
  }
}
