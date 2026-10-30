package com.student.management.iam.user.entity;

import com.student.management.shared.entity.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

/**
 * Enterprise User entity located in the IAM User Management directory.
 * Implements Spring Security UserDetails for authentication and authorization.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class User extends BaseEntity implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
    @Column(name = "username", nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "email", length = 150, unique = true)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    @Column(name = "password", nullable = false, length = 255)
    private String password;

    @Size(max = 150, message = "Full name cannot exceed 150 characters")
    @Column(name = "full_name", length = 150)
    private String fullName;

    @Builder.Default
    @Column(name = "role", length = 50)
    private String role = "ADMIN";

    @Builder.Default
    @Column(name = "is_super_admin")
    private Boolean isSuperAdmin = false;

    public User(String username, String password, String fullName, String role) {
        this.username = username;
        this.password = password;
        this.fullName = fullName;
        this.role = role != null ? role : "ADMIN";
        this.isSuperAdmin = "PLATFORM_SUPER_ADMIN".equalsIgnoreCase(role);
    }

    public User(String username, String email, String password, String fullName, String role, Boolean isSuperAdmin) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.role = role != null ? role : "ADMIN";
        this.isSuperAdmin = isSuperAdmin != null ? isSuperAdmin : false;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (role == null || role.isBlank()) {
            return Collections.emptyList();
        }
        String authority = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        return Collections.singletonList(new SimpleGrantedAuthority(authority));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
