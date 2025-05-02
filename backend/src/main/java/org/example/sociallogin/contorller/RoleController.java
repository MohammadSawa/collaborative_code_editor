package org.example.sociallogin.contorller;

import org.example.sociallogin.model.AccessControl;
import org.example.sociallogin.service.AccessBody;
import org.example.sociallogin.service.RoleAssignmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/roles")
public class RoleController {

    @Autowired
    private RoleAssignmentService roleAssignmentService;

    @PostMapping("/assign")
    public ResponseEntity<Void> assignRole(@RequestBody AccessBody accessBody) {
        String userId = accessBody.getUserId();
        String resourcePath = accessBody.getResourcePath();
        String role = accessBody.getRole();
        AccessControl.Role roleEnum = AccessControl.Role.valueOf(role.toUpperCase());  // Ensure case-insensitivity if needed
        roleAssignmentService.assignRoleToUser( userId, resourcePath, roleEnum);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/retrieve")
    public ResponseEntity<Map<String, String>> retrieveRole(@RequestBody AccessBody accessBody,  Authentication authentication) {
        String userId = accessBody.getUserId();
        String resourcePath = accessBody.getResourcePath();
        // Debug authentication status
        if (authentication == null || !authentication.isAuthenticated()) {
            System.out.println("User not authenticated in controller");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        System.out.println("User authenticated as: " + authentication.getName());

        String role = roleAssignmentService.retrieveRole(userId, resourcePath);
        if (role != null) {
            Map<String, String> response = new HashMap<>();
            response.put("role", role);
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteRole(@RequestBody AccessBody accessBody) {
        String userId = accessBody.getUserId();
        String resourcePath = accessBody.getResourcePath();

        roleAssignmentService.deleteRoleToUser(userId,resourcePath);
        return ResponseEntity.ok().build();
    }

}
