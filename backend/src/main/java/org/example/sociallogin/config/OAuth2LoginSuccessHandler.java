package org.example.sociallogin.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.sociallogin.model.UserEntity;
import org.example.sociallogin.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Paths;

@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final String fileStorageRoot;

    public OAuth2LoginSuccessHandler(UserRepository userRepository,
                                     @Value("${file.storage.root}") String fileStorageRoot) {
        this.userRepository = userRepository;
        this.fileStorageRoot = fileStorageRoot;
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        // Validate principal
        if (!(authentication.getPrincipal() instanceof OAuth2User oauthUser)) {
            response.sendRedirect("/error?message=Invalid+authentication+type");
            return;
        }

        // Validate email
        String email = oauthUser.getAttribute("email");
        if (email == null || email.isEmpty()) {
            response.sendRedirect("/error?message=Missing+email+from+OAuth2+provider");
            return;
        }

        // Provision user if not exists
        userRepository.findById(email).orElseGet(() -> {
            UserEntity user = new UserEntity();
            user.setName(email);
            user.setRootPath(Paths.get(fileStorageRoot, email).toString());
            return userRepository.save(user);
        });

        // Proceed with default redirect (e.g., /editor)
        super.onAuthenticationSuccess(request, response, authentication);
    }
}