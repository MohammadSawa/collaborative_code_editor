package org.example.sociallogin.service;


import lombok.Data;

@Data
public class FileDeleteRequest {
    public String type;
    public String path;
    public String userId;
}
