package org.example.sociallogin.contorller;


import org.example.sociallogin.model.AccessControl;
import org.example.sociallogin.model.UserEntity;
import org.example.sociallogin.dto.ForkRequest;
import org.example.sociallogin.exception.FileAlreadyExistsException;
import org.example.sociallogin.exception.FileNotFoundException;
import org.example.sociallogin.exception.FileOperationException;
import org.example.sociallogin.repository.AccessControlRepository;
import org.example.sociallogin.repository.UserRepository;
import org.example.sociallogin.service.FileCreateRequest;
import org.example.sociallogin.service.FileDeleteRequest;
import org.example.sociallogin.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.*;
import java.security.Principal;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;


@RestController
@RequestMapping("/files")
public class FileController {

    @Autowired
    private final FileService fileService;
    private final UserRepository userRepository;
    private final AccessControlRepository accessControlRepository;

    public FileController(FileService fileService , UserRepository userRepository , AccessControlRepository accessControlRepository) {
        this.fileService = fileService;
        this.userRepository = userRepository;
        this.accessControlRepository = accessControlRepository;
    }

    @PostMapping("/retrieve")
    public ResponseEntity<?> retrieve(@RequestBody FileCreateRequest fileCreateRequest) {
        String type = fileCreateRequest.getType();
        String path = fileCreateRequest.getParentPath();

        Object result = fileService.retrieve(type, path != null ? path : "");
        return ResponseEntity.ok(result);
    }

    @PostMapping("/create")
    public ResponseEntity<String> createWorkspace(@RequestBody FileCreateRequest request){
        fileService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/update")
    public ResponseEntity<String> update(@RequestBody FileCreateRequest request){
        fileService.update(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/delete")
    public ResponseEntity<String> delete(@RequestBody FileDeleteRequest request){
        fileService.delete(request);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @PostMapping("/workspace/clone")
    public ResponseEntity<Resource> cloneWorkspace(@RequestBody Map<String, String> request) throws IOException {
        String workspacePathStr = request.get("path");
        if (workspacePathStr == null || workspacePathStr.isBlank()) {
            return ResponseEntity.badRequest().body(null);
        }

        Path workspacePath = Paths.get(workspacePathStr);
        if (!Files.exists(workspacePath) || !Files.isDirectory(workspacePath)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }

        Path zipPath = zipWorkspace(workspacePath);
        Resource fileResource = new FileSystemResource(zipPath.toFile());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + zipPath.getFileName().toString() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(fileResource);
    }

    public Path zipWorkspace(Path sourceDirPath) throws IOException {
        Path zipPath = Files.createTempFile("workspace-", ".zip");

        try (ZipOutputStream zs = new ZipOutputStream(Files.newOutputStream(zipPath))) {
            Files.walk(sourceDirPath)
                    .filter(path -> !Files.isDirectory(path))
                    .forEach(path -> {
                        ZipEntry zipEntry = new ZipEntry(sourceDirPath.relativize(path).toString());
                        try {
                            zs.putNextEntry(zipEntry);
                            Files.copy(path, zs);
                            zs.closeEntry();
                        } catch (IOException e) {
                            throw new UncheckedIOException(e);
                        }
                    });
        }

        return zipPath;
    }

    @PostMapping("/fork")
    public ResponseEntity<?> forkWorkspace(@RequestBody ForkRequest request, Principal principal) throws IOException {
        Path sourcePath = Paths.get(request.getSourcePath());
        String newWorkspaceName = request.getNewWorkspaceName();

        if (principal == null) {
            throw new AccessDeniedException("Unauthorized WebSocket access");
        }

        if (!(principal instanceof OAuth2AuthenticationToken token)) {
            throw new AccessDeniedException("Invalid principal type");
        }

        OAuth2User oauthUser = token.getPrincipal();
        String email = oauthUser.getAttribute("email");
        if (email == null) {
            throw new AccessDeniedException("Email not found in user attributes");
        }

        Path targetPath = Paths.get("./files", email, newWorkspaceName);

        try {
            // Copy directory structure
            Files.walk(sourcePath).forEach(source -> {
                Path destination = targetPath.resolve(sourcePath.relativize(source));
                try {
                    if (Files.isDirectory(source)) {
                        Files.createDirectories(destination);
                    } else {
                        Files.copy(source, destination, StandardCopyOption.REPLACE_EXISTING);
                    }
                } catch (IOException e) {
                    throw new RuntimeException("Error copying file: " + source, e);
                }
            });

            // Save access control to DB
            UserEntity userEntity = userRepository.findById(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            AccessControl access = new AccessControl();
            access.setUser(userEntity); // FK relation
            access.setResourcePath(targetPath.toString());
            access.setRole(AccessControl.Role.ADMIN); // Creator is admin

            try {
                accessControlRepository.save(access);
            } catch (Exception e) {
                Throwable cause = e;
                while (cause.getCause() != null) cause = cause.getCause();
                throw new RuntimeException("🔥 DB Save Failed: " + cause.getMessage(), cause);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body("Workspace forked and access granted");

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Fork failed: " + e.getMessage());
        }
    }



    @ExceptionHandler(FileNotFoundException.class)
    public ResponseEntity<String> handleNotFound(FileNotFoundException e) {
        return ResponseEntity.status(404).body(e.getMessage());
    }

    @ExceptionHandler(FileAlreadyExistsException.class)
    public ResponseEntity<String> handleConflict(FileAlreadyExistsException e) {
        return ResponseEntity.status(409).body(e.getMessage());
    }

    @ExceptionHandler(FileOperationException.class)
    public ResponseEntity<String> handleOperationError(FileOperationException e) {
        return ResponseEntity.status(500).body(e.getMessage());
    }

}
