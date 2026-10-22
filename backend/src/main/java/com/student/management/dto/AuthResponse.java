package com.student.management.dto;

public class AuthResponse {

    private boolean success;
    private String message;
    private String token;
    private String username;
    private String fullName;
    private String role;

    public AuthResponse() {
    }

    public AuthResponse(boolean success, String message, String token, String username, String fullName, String role) {
        this.success = success;
        this.message = message;
        this.token = token;
        this.username = username;
        this.fullName = fullName;
        this.role = role;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
