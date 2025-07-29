package org.example.sociallogin.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
public class UserEntity {
    @Id
    @Column(nullable = false)
    private String name;
    @Column
    private String rootPath;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    private List<AccessControl> accessControls = new ArrayList<>();
}
