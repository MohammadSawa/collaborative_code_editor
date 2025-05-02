package org.example.sociallogin.contorller;


import org.example.sociallogin.dto.CodeRequest;
import org.example.sociallogin.dto.CodeResponse;
import org.example.sociallogin.dto.FileHistoryDTO;
import org.example.sociallogin.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.nio.file.AccessDeniedException;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/history")
public class HistoryController {
    private final FileService fileService;

    @Autowired
    public HistoryController(FileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping("/commit")
    public ResponseEntity<Void> commitSnapshot(@RequestBody CodeRequest request, Principal principal) throws AccessDeniedException {
        String email = getUsername(principal);

        fileService.commitSnapshot(email,request.getFileName(),request.getCode(),request.getMessage(),request.getPath());
        return ResponseEntity.ok().build();
    }

    private static String getUsername(Principal principal) throws AccessDeniedException {
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
        return email;
    }

    @PostMapping("/revert")
    public ResponseEntity<CodeResponse> revert(@RequestBody CodeRequest request, Principal principal) throws AccessDeniedException {
        if (principal == null) throw new AccessDeniedException("Unauthorized WebSocket access");

        if (!(principal instanceof OAuth2AuthenticationToken token))
            throw new AccessDeniedException("Invalid principal type");

        OAuth2User oauthUser = token.getPrincipal();
        String email = oauthUser.getAttribute("email");
        if (email == null) throw new AccessDeniedException("Email not found");

        String code = fileService.revert(request.getName(), request.getFileName(),String.valueOf(request.getTimestamp()));
        return ResponseEntity.ok(new CodeResponse(code));
    }


    @PostMapping
    ResponseEntity<List<FileHistoryDTO>> history( @RequestBody CodeRequest request, Principal principal) throws AccessDeniedException {
        String email = getUsername(principal);
        String projectPath =request.getPath();
        List<FileHistoryDTO> history = fileService.getHistory(projectPath,email);
        return ResponseEntity.ok(history);
    }

}
