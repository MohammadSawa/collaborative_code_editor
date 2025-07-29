package org.example.sociallogin.service;


import org.example.sociallogin.model.AccessControl;
import org.example.sociallogin.model.HistoryEntity;
import org.example.sociallogin.model.UserEntity;
import org.example.sociallogin.dto.FileHistoryDTO;
import org.example.sociallogin.exception.FileOperationException;
import org.example.sociallogin.node.FileNode;
import org.example.sociallogin.repository.AccessControlRepository;
import org.example.sociallogin.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.example.sociallogin.repository.HistoryRepository;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.*;


import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class FileService {

    @Value("${file.storage.root}")
    private String fileStorageRoot;
    private final UserRepository userRepository;
    private final AccessControlRepository accessControlRepository;
    private final HistoryRepository historyRepository;
    private static final Logger logger = LoggerFactory.getLogger(FileService.class);
    private static final Pattern VALID_FILENAME = Pattern.compile("^[a-zA-Z0-9_]+(\\.[a-zA-Z0-9]+)?$");
    private final SimpMessagingTemplate messagingTemplate;

    public FileService(UserRepository userRepository, AccessControlRepository accessControlRepository, SimpMessagingTemplate messagingTemplate,HistoryRepository historyRepository) {
        this.userRepository = userRepository;
        this.accessControlRepository= accessControlRepository;
        this.messagingTemplate = messagingTemplate;
        this.historyRepository = historyRepository;
    }


    public String getUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            Object principal = auth.getPrincipal();

            if (principal instanceof Jwt jwt) {
                // If the principal is a Jwt object (e.g., from a Google JWT)
                return jwt.getClaim("email");
            } else if (principal instanceof OAuth2User oauth2User) {
                // If the principal is an OAuth2User (e.g., from OAuth2 login with Google or GitHub)
                return oauth2User.getAttribute("email");
            }
        }
        return "anonymousUser";
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf(".");
        return (dotIndex == -1) ? "" : filename.substring(dotIndex + 1);
    }

    private String sanitizeUsername(String username) {
        return username.replaceAll("[^a-zA-Z0-9_-]", "_");
    }

    public List<String> getUserWorkspaces() {
        String username = getUsername();

        // Fetch access control entries
        List<AccessControl> accessEntries = accessControlRepository.findByUserName(username);
        //make loop to see in side the file in addtion remove the this ./riden or discard it
        return accessEntries.stream()
                .map(AccessControl::getResourcePath)
                .distinct()
                .collect(Collectors.toList());
    }

    public Path getWorkspacePath(String workspaceName) {
        String username = getUsername();
        String rootPath = findOrCreateRootPath(username);
        String workspacePath = Paths.get(rootPath, workspaceName).toString();
        return Path.of(workspacePath);
    }

    public FileNode getDirStructure(Path path) throws IOException {
        if (Files.isDirectory(path)) {
            FileNode dirNode = new FileNode(path.getFileName().toString(), "directory");
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(path)) {
                for (Path entry : stream) {
                    dirNode.getChildren().add(getDirStructure(entry));
                }
            }
            return dirNode;
        } else {
            return new FileNode(path.getFileName().toString(), "file");
        }
    }

    public Object retrieve(String type, String relativePath) {
        String username = getUsername();
        return switch (type) {
            case "workspaces" -> getUserWorkspaces();

            case "directory", "file" -> {

                if (!hasAnyRole(username, relativePath,
                        AccessControl.Role.ADMIN,
                        AccessControl.Role.EDITOR,
                        AccessControl.Role.VIEWER)) {
                    throw new FileOperationException("You do not have permission to access this resource.");
                }

                Path path = Path.of(relativePath);
                try {
                    yield type.equals("directory") ? getDirStructure(path) : Files.readString(path);
                } catch (IOException e) {
                    throw new FileOperationException("Failed to retrieve: " + path, e);
                }
            }

            default -> throw new IllegalArgumentException("Invalid retrieval type");
        };
    }

    public void create(FileCreateRequest request) {
        String username = getUsername(); // Logged-in user's email

        // Only check access for "directory" and "file" creation
        if (!"workspace".equals(request.getType())) {
            if (request.getParentPath() == null || request.getParentPath().isBlank())
                throw new IllegalArgumentException("Parent path is required for type: " + request.getType());

            // Enforce access control
            if (!hasAnyRole(username, request.getParentPath(), AccessControl.Role.ADMIN, AccessControl.Role.EDITOR)) {
                throw new org.springframework.security.access.AccessDeniedException(
                        "You do not have permission to create " + request.getType() + " in this directory."
                );
            }

        }

        Path targetPath;
        switch (request.getType()) {
            case "workspace":
                UserEntity userEntity = userRepository.findById(username)
                        .orElseGet(() -> {
                            UserEntity user = new UserEntity();
                            user.setName(username);
                            user.setRootPath(Paths.get(fileStorageRoot, username).toString());
                            return userRepository.save(user);
                        });
                targetPath = getWorkspacePath(request.getName());
                AccessControl access = new AccessControl();
                access.setUser(userEntity); // Foreign key relationship with UserEntity
                access.setResourcePath(String.valueOf(targetPath)); // Full virtual path (should be a valid path)
                access.setRole(AccessControl.Role.ADMIN); // Assign role (ADMIN, WRITER, VIEWER)
                try {
                    accessControlRepository.save(access);
                } catch (Exception e) {
                    Throwable cause = e;
                    while (cause.getCause() != null) cause = cause.getCause();
                    throw new RuntimeException("DB Save Failed: " + cause.getMessage(), cause);
                }                break;

            case "directory":
            case "file":
                targetPath = resolveTargetPathForCreation(username,request.getParentPath(), request.getName());
                break;

            default:
                throw new IllegalArgumentException("Invalid request type: " + request.getType());
        }

        try {
            if ("file".equals(request.getType())) {
                if (!Files.exists(targetPath.getParent())) {
                    Files.createDirectories(targetPath.getParent());
                }
                if (!Files.exists(targetPath)) {
                    Files.createFile(targetPath);
                } else {
                    throw new FileOperationException("File already exists: " + targetPath);
                }
            } else {
                Files.createDirectories(targetPath);
            }
        } catch (IOException e) {
            throw new FileOperationException("Failed to create " + request.getType() + ": " + targetPath, e);
        }
    }

    public String findOrCreateRootPath(String email) {
        return userRepository.findById(email)
                .map(UserEntity::getRootPath)
                .orElseGet(() -> {
                    UserEntity user = new UserEntity();
                    user.setName(email);
                    user.setRootPath(Paths.get(fileStorageRoot, email).toString());
                    userRepository.save(user);
                    return user.getRootPath();
                });
    }

    public void update(FileCreateRequest request) {
        String username = getUsername();
        String rootPath = findOrCreateRootPath(username);
        Path currentPath = Path.of(request.getCurrentPath());

        if (!hasAnyRole(username, request.getCurrentPath(), AccessControl.Role.ADMIN, AccessControl.Role.EDITOR)) {
            throw new FileOperationException("You do not have permission to update this file.");
        }

        if (Boolean.TRUE.equals(request.getUpdateContent()) && "file".equals(request.getType())) {
            try {
                Files.writeString(currentPath, request.getNewContent(), StandardOpenOption.TRUNCATE_EXISTING);
            } catch (IOException e) {
                throw new FileOperationException("Failed to update file content", e);
            }
        }

        if (request.getNewName() != null || request.getNewParentPath() != null) {
            Path newParent = request.getNewParentPath() != null
                    ? Paths.get(rootPath, request.getNewParentPath())
                    : currentPath.getParent();

            Path newFileName = request.getNewName() != null
                    ? Paths.get(request.getNewName())
                    : currentPath.getFileName();

            Path newPath = newParent.resolve(newFileName);

            try {
                Files.move(currentPath, newPath, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                throw new FileOperationException("Failed to move/rename", e);
            }
        }
    }

    public void delete(FileDeleteRequest request) {
        String username = getUsername();
        Path targetPath = buildTargetPath(username, request.getPath());

        if ("workspace".equals(request.getType())) {
            if (!hasAnyRole(username, request.getPath(), AccessControl.Role.ADMIN)) {
                throw new FileOperationException("Only admins can delete workspaces.");
            }
        } else {
            if (!hasAnyRole(username, request.getPath(), AccessControl.Role.ADMIN, AccessControl.Role.EDITOR)) {
                throw new FileOperationException("You do not have permission to delete this resource.");
            }
        }

        try {
            if (isDirectoryDeletion(request.getType())) {
                deleteDirectoryRecursively(Path.of(request.getPath()));
            } else {
                Files.delete(Path.of(request.getPath()));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete path: " + targetPath, e);
        }
    }


    private Path buildTargetPath(String username, String relativePath) {
        String rootPath = findOrCreateRootPath(username);
        return Paths.get(rootPath).resolve(relativePath).normalize();
    }

    private boolean isDirectoryDeletion(String type) {
        return "workspace".equals(type) || "directory".equals(type);
    }

    private void deleteDirectoryRecursively(Path directory) throws IOException {
        Files.walk(directory)
                .sorted(Comparator.reverseOrder())
                .forEach(path -> {
                    try {
                        Files.delete(path);
                    } catch (IOException e) {
                        throw new UncheckedIOException(e);
                    }
                });
    }

    private boolean hasAnyRole(String userId, String targetPath, AccessControl.Role... allowedRoles) {
        // Normalize path slashes
        String normalizedTargetPath = targetPath.replace("/", "\\");

        // Fetch access controls from repository (assuming accessControlRepository gives a list)
        List<AccessControl> userAccessList = accessControlRepository.findByUserName(userId); // Assuming this method returns all access controls for the user

        // If no access control exists for the user, return false
        if (userAccessList.isEmpty()) {
            return false;
        }

        // Iterate through the access controls
        for (AccessControl access : userAccessList) {
            String basePath = access.getResourcePath().replace("/", "\\"); // Normalize base path

            // Check if the role matches and if the target path starts with base path
            for (AccessControl.Role role : allowedRoles) {
                if (access.getRole() == role && normalizedTargetPath.startsWith(basePath)) {
                    return true;
                }
            }
        }

        return false;
    }


    private Path resolveTargetPathForCreation(String username,String parentPath, String name) {
//        String normalizedParentPath = parentPath.replace("/", "\\"); // Match DB formatting
        try {
            return Paths.get(parentPath.replace("\\", "/"), name).normalize();
        } catch (Exception e) {
            Throwable cause = e;
            while (cause.getCause() != null) cause = cause.getCause();
            throw new RuntimeException(" DB Save Failed: " + cause.getMessage(), cause);
        }

    }

    public void updateForWebSockets(String username,String type,String filePath,String content) {

        if (!hasAnyRole(username, filePath, AccessControl.Role.ADMIN, AccessControl.Role.EDITOR)) {
            throw new FileOperationException("You do not have permission to update this file.");
        }

        if ("file".equals(type)) {
            try {
                Files.writeString(Path.of(filePath), content, StandardOpenOption.TRUNCATE_EXISTING);
            } catch (IOException e) {
                throw new FileOperationException("Failed to update file content", e);
            }
        }
    }

    public void commitSnapshot(String username, String fileName, String code,String message,String path) {
        String historyPath = fileStorageRoot + "/" + username + "history";

        // Step 1: Ensure history directory exists
        File historyDir = new File(historyPath);
        if (!historyDir.exists()) {
            boolean created = historyDir.mkdirs();
            if (!created) {
                throw new RuntimeException("Failed to create history directory for user: " + username);
            }
        }

        // Step 2: Generate timestamped filename

        String timestampStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        LocalDateTime timestamp = LocalDateTime.now();
        File versionedFile = new File(historyDir, fileName + "_" + timestampStr + ".txt");

        // Step 3: Write snapshot content
        try (FileWriter writer = new FileWriter(versionedFile)) {
            writer.write(code);
        } catch (IOException e) {
            throw new RuntimeException("Error writing commit snapshot", e);
        }

        saveCommitMetadata(username, fileName, versionedFile.getPath(), timestamp,message,path);
    }

    private void saveCommitMetadata(String username, String fileName, String path, LocalDateTime timestamp,String message,String projectPath) {
        HistoryEntity history = HistoryEntity.builder()
                .username(username)
                .fileName(fileName)
                .filePath(path)
                .timestamp(timestamp)
                .message(message)
                .projectPath(projectPath)
                .build();
        historyRepository.save(history);
    }

    public List<FileHistoryDTO> getHistory(String projectPath ,String email) {
        List<HistoryEntity> historyRecords = historyRepository.findByProjectPath(projectPath);

        return historyRecords.stream()
                .map(record -> new FileHistoryDTO(email,record.getFileName(), record.getTimestamp(),record.getMessage()))
                .toList();
    }

    public String revert(String name, String fileName, String timestamp) {
        LocalDateTime parsedTimestamp = LocalDateTime.parse(timestamp);

        HistoryEntity history = historyRepository.findByUsernameAndFileNameAndTimestamp(name, fileName, parsedTimestamp)
                .orElseThrow(() -> new RuntimeException("Commit history entry not found"));

        String filePath = history.getFilePath();

        try {
            return Files.readString(Paths.get(filePath));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read historical file", e);
        }
    }
    public static String normalizePath(String rawPath) {
        if (rawPath == null || rawPath.trim().isEmpty()) {
            throw new IllegalArgumentException("Input path cannot be null or empty.");
        }

        // Replace mixed slashes with system separator
        String systemSeparator = System.getProperty("file.separator");
        String sanitizedPath = rawPath.replace("\\", systemSeparator).replace("/", systemSeparator);

        // Normalize using java.nio
        Path normalized = Paths.get(sanitizedPath).normalize();

        return normalized.toString();
    }
}
