package org.example.sociallogin.dto;

import lombok.Data;

@Data
public class ForkRequest {
    private String sourcePath;
    private String newWorkspaceName;
    private String owner;
}
