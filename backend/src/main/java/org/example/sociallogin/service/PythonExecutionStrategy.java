package org.example.sociallogin.service;

import org.example.sociallogin.service.CodeExecutionStrategy;
import org.springframework.stereotype.Component;

@Component
public class PythonExecutionStrategy implements CodeExecutionStrategy {
    public String getFilename(String className) { return "script.py"; }
    public String getImage() { return "python:3.9"; }
    public String getContainerCommand(String filename, String className) {
        return "python /app/" + filename;
    }
}
