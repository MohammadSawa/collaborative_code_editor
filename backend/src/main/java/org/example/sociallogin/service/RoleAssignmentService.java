package org.example.sociallogin.service;

import lombok.RequiredArgsConstructor;
import org.example.sociallogin.model.AccessControl;
import org.example.sociallogin.model.UserEntity;
import org.example.sociallogin.repository.AccessControlRepository;
import org.example.sociallogin.repository.UserRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RoleAssignmentService {

    private final UserRepository userRepository;
    private final AccessControlRepository accessControlRepository;
    private final FileService fileService;

    @Transactional
    public void assignRoleToUser(String userId, String resourcePath, AccessControl.Role role) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + userId));

        AccessControl accessControl = accessControlRepository
                .findByUserNameAndResourcePath(userId, resourcePath) // Optimize query
                .orElseGet(() -> {
                    AccessControl newAccessControl = new AccessControl();
                    newAccessControl.setUser(user);
                    return newAccessControl;
                });

        accessControl.setUser(user);
        accessControl.setResourcePath(resourcePath);
        accessControl.setRole(role);
        try {
            accessControlRepository.save(accessControl);
        } catch (Exception e) {
            Throwable cause = e;
            while (cause.getCause() != null) cause = cause.getCause();
            throw new RuntimeException("DB Save Failed: " + cause.getMessage(), cause);
        }
    }

    public String retrieveRole(String userId, String resourcePath) {
        String username = fileService.getUsername();

        return accessControlRepository.findByUserNameAndResourcePath(username, resourcePath)
                .map(accessControl -> accessControl.getRole().name()) // Convert enum to string
                .orElse(null);
    }


    public void deleteRoleToUser(String userId, String resourcePath) {
        Optional<AccessControl> accessControlOpt = accessControlRepository.findByUserNameAndResourcePath(userId, resourcePath);

        if (accessControlOpt.isPresent()) {
            accessControlRepository.delete(accessControlOpt.get());
        } else {
            throw new RuntimeException("Role assignment not found for user: " + userId + " and resource: " + resourcePath);
        }
    }
}

