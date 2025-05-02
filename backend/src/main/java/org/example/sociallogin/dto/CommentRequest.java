package org.example.sociallogin.dto;

import lombok.Data;

@Data
public class CommentRequest {
    private String filePath;
    private int line;
    private String text;
}