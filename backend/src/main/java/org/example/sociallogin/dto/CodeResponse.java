package org.example.sociallogin.dto;

// CodeResponse.java

import lombok.Data;

@Data
public class CodeResponse {
    private String output;
    public CodeResponse(String output) {
        this.output = output;
    }
}