package org.example.sociallogin.repository;

import org.example.sociallogin.model.HistoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface HistoryRepository extends JpaRepository<HistoryEntity, Long> {
    Optional<HistoryEntity> findByUsernameAndFileNameAndTimestamp(String username, String fileName, LocalDateTime timestamp);
    List<HistoryEntity> findByProjectPath(String projectPath);
}
