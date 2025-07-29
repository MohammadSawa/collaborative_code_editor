package org.example.sociallogin.service;


import lombok.Data;

@Data
public class FileCreateRequest {
    private String type; // "workspace", "directory", "file"
    private String name;
    private String newName;
    private String parentPath; // Relative to root (null for workspace)
    private String newParentPath;
    private String currentPath;
    private String newContent;
    private String userId;
    private Boolean updateContent;

}
