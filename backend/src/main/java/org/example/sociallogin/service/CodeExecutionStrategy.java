package org.example.sociallogin.service;

public interface CodeExecutionStrategy {
    String getFilename(String className);
    String getImage();
    String getContainerCommand(String filename, String className);
}
