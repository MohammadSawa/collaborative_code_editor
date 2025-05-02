package org.example.sociallogin.config;

import lombok.RequiredArgsConstructor;
import org.example.sociallogin.repository.AccessControlRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

@Component("permissionEvaluator")
@RequiredArgsConstructor
public class CustomPermissionEvaluator {

    private final AccessControlRepository accessControlRepository;

    public boolean hasPermission(Authentication authentication, String resourcePath, String requiredRole) {


        String email = authentication.getName();
        return accessControlRepository
                .findByUserNameAndResourcePath(email, resourcePath)
                .map(ac -> hasSufficientRole(ac.getRole().toString(), requiredRole))
                .orElse(false);
    }

    private boolean hasSufficientRole(String actualRole, String requiredRole) {
        return switch (requiredRole) {
            case "READER" -> actualRole.equals("READER") || actualRole.equals("WRITER") || actualRole.equals("ADMIN");
            case "WRITER" -> actualRole.equals("WRITER") || actualRole.equals("ADMIN");
            case "ADMIN" -> actualRole.equals("ADMIN");
            default -> false;
        };
    }
}
