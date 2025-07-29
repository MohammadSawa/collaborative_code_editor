package org.example.sociallogin.dto;

import java.time.LocalDateTime;

public record FileHistoryDTO(String name,String fileName, LocalDateTime commitDate, String commitMessage) {}

