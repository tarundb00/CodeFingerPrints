package com.example.codeFingerPrint.repository;

import com.example.codeFingerPrint.entity.GitHubConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GitHubConfigRepository extends JpaRepository<GitHubConfig, Long> {
  Optional<GitHubConfig> findFirstByStatusOrderByIdDesc(String status);
}
