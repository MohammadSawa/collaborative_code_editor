package org.example.sociallogin.service;

import org.springframework.stereotype.Component;

@Component
public class JavaExecutionStrategy implements CodeExecutionStrategy {
    public String getFilename(String className) { return className + ".java"; }
    public String getImage() { return "openjdk:17"; }
    public String getContainerCommand(String filename, String className) {
        return "cd /app && javac " + filename + " && java " + className;
    }
}
