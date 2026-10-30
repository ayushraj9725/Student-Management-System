package com.student.management.iam.controller;

import com.student.management.iam.dto.request.*;
import com.student.management.iam.dto.response.AuthTokenResponse;
import com.student.management.iam.dto.response.OtpVerificationResponse;
import com.student.management.iam.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller exposing production-grade REST endpoints for authentication,
 * JWT token rotation, OTP verification, and secure password lifecycle management.
 */
@Slf4j
@RestController
@RequestMapping("${api.prefix:/api/v1}/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthTokenResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("REST request to authenticate user: {}", request.getUsernameOrEmail());
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthTokenResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        log.info("REST request to refresh access token");
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("REST request to initiate forgot password for: {}", request.getEmail());
        authService.forgotPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<OtpVerificationResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        log.info("REST request to verify OTP for: {}", request.getEmail());
        return ResponseEntity.ok(authService.verifyOtp(request));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("REST request to reset password for: {}", request.getEmail());
        authService.resetPassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestParam(required = false) String refreshToken) {
        log.info("REST request to logout user session");
        authService.logout(refreshToken);
        return ResponseEntity.ok().build();
    }
}
