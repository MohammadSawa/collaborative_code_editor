package org.example.sociallogin.service;

import org.springframework.stereotype.Component;

@Component
public class CppExecutionStrategy implements CodeExecutionStrategy {
    public String getFilename(String className) { return "main.cpp"; }
    public String getImage() { return "gcc:latest"; }
    public String getContainerCommand(String filename, String className) {
        return "g++ /app/main.cpp -o /app/a.out && /app/a.out";
    }
}
