package org.example.sociallogin.node;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

public class FileNode {
    private String name;
    private String type; // "file" or "directory"
    private List<FileNode> children;

    public FileNode(String name, String type) {
        this.name = name;
        this.type = type;
        if ("directory".equals(type)) {
            this.children = new ArrayList<>();
        }
    }

    // Getters and setters (required for JSON serialization)
    public String getName() { return name; }
    public String getType() { return type; }
    public List<FileNode> getChildren() { return children; }
}
