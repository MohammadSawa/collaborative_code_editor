package org.example.sociallogin.repository;

import org.example.sociallogin.model.AccessControl;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccessControlRepository extends JpaRepository<AccessControl, Long> {
    Optional<AccessControl> findByUserNameAndResourcePath(String userName, String resourcePath);
    List<AccessControl> findByUserName(String name); // if using @ManyToOne relationship
}
