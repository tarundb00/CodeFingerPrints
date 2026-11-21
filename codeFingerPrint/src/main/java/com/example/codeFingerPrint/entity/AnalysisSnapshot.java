package com.example.codeFingerPrint.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
public class AnalysisSnapshot {
  @Id
  private Long projectId;

  @MapsId
  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "project_id")
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Project project;

  @Lob
  @Column(nullable = false, columnDefinition = "LONGTEXT")
  private String report;

  protected AnalysisSnapshot() {}
  public AnalysisSnapshot(Project project) { this.project = project; }
  public String getReport() { return report; }
  public void setReport(String report) { this.report = report; }
}
