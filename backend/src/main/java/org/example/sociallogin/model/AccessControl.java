package org.example.sociallogin.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;

@Entity
@Table(name = "access_control")
@Data
public class AccessControl {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_name", referencedColumnName = "name", nullable = false)
    @ToString.Exclude
    private UserEntity user;

    @Column(nullable = false)
    private String resourcePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    public enum Role {
        ADMIN,
        EDITOR,
        VIEWER
    }
}
