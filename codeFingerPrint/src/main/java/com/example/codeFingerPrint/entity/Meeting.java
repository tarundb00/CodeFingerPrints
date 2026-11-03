package com.example.codeFingerPrint.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "meetings")
public class Meeting {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  private Long projectId;
  private Long teamId;
  private String title;
  private String meetingDate;
  private String status;
  private String conductedBy;
  @Column(length = 4000)
  private String discussionSummary;
  @Column(length = 4000)
  private String actionItems;
  @Column(length = 4000)
  private String attendanceJson;

  public Long getId() { return id; }
  public Long getProjectId() { return projectId; }
  public void setProjectId(Long value) { projectId = value; }
  public Long getTeamId() { return teamId; }
  public void setTeamId(Long value) { teamId = value; }
  public String getTitle() { return title; }
  public void setTitle(String value) { title = value; }
  public String getMeetingDate() { return meetingDate; }
  public void setMeetingDate(String value) { meetingDate = value; }
  public String getStatus() { return status; }
  public void setStatus(String value) { status = value; }
  public String getConductedBy() { return conductedBy; }
  public void setConductedBy(String value) { conductedBy = value; }
  public String getDiscussionSummary() { return discussionSummary; }
  public void setDiscussionSummary(String value) { discussionSummary = value; }
  public String getActionItems() { return actionItems; }
  public void setActionItems(String value) { actionItems = value; }
  public String getAttendanceJson() { return attendanceJson; }
  public void setAttendanceJson(String value) { attendanceJson = value; }
}