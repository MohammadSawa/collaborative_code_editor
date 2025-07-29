package org.example.sociallogin.service;


import lombok.Data;

@Data
public class AccessBody {
    private String userId;
    private String resourcePath;
    private String role;
}
