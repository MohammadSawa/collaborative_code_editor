package org.example.sociallogin.sockets;

import org.example.sociallogin.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;

import java.nio.file.AccessDeniedException;
import java.security.Principal;

@Controller
public class MessageController {

    @Autowired
    private final FileService fileService;
    private final SimpMessagingTemplate messagingTemplate;

    public MessageController(SimpMessagingTemplate messagingTemplate, FileService fileService) {
        this.messagingTemplate = messagingTemplate;
        this.fileService = fileService;
    }

    @MessageMapping("/communication")
    public void sendToChannel(Message message, Principal principal) throws AccessDeniedException {

        String username = getUsername(principal);

        // Business logic
        String filePath = message.getFilePath();
        messagingTemplate.convertAndSend("/topic/" + filePath, message);

        fileService.updateForWebSockets(username,"file",filePath,message.getContent());
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

        System.out.println("WebSocket message from: " + email);
        return email;
    }
}
