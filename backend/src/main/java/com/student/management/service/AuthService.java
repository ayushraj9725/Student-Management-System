package com.student.management.service;

import com.student.management.config.PasswordUtil;
import com.student.management.dto.AuthResponse;
import com.student.management.dto.LoginRequest;
import com.student.management.dto.RegisterRequest;
import com.student.management.entity.User;
import com.student.management.exception.BadRequestException;
import com.student.management.exception.DuplicateResourceException;
import com.student.management.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;

    @Autowired
    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public AuthResponse register(RegisterRequest request) {
        String trimmedUsername = request.getUsername().trim();
        if (userRepository.existsByUsername(trimmedUsername)) {
            throw new DuplicateResourceException("Username '" + trimmedUsername + "' is already registered. Please choose another username.");
        }

        String hashedPassword = PasswordUtil.hashPassword(request.getPassword());
        User user = new User(trimmedUsername, hashedPassword, request.getFullName().trim(), "ADMIN");
        userRepository.save(user);

        String token = "TOKEN-" + UUID.randomUUID().toString();
        return new AuthResponse(
                true,
                "User registered successfully! You can now log in.",
                token,
                user.getUsername(),
                user.getFullName(),
                user.getRole()
        );
    }

    public AuthResponse login(LoginRequest request) {
        String trimmedUsername = request.getUsername().trim();
        User user = userRepository.findByUsername(trimmedUsername)
                .orElseThrow(() -> new BadRequestException("Invalid username or password."));

        if (!PasswordUtil.verifyPassword(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid username or password.");
        }

        String token = "TOKEN-" + UUID.randomUUID().toString();
        return new AuthResponse(
                true,
                "Login successful! Welcome back, " + user.getFullName() + ".",
                token,
                user.getUsername(),
                user.getFullName(),
                user.getRole()
        );
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new BadRequestException("User not found with username: " + username));
    }
}
