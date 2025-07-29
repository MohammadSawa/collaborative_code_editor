package org.example.sociallogin.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CodeRequest {
    private String name;
    private String fileName;
    private String code;
    private String input;
    private String language;
    private String message;
    private LocalDateTime timestamp;
    private String path;
}
