package org.example.sociallogin.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "history_table")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "project_path")
    private String projectPath;
    @Column(name = "file_path", columnDefinition = "TEXT")
    private String filePath;

    private LocalDateTime timestamp;
    @Column(columnDefinition = "TEXT")
    private String message;

}
