package com.student.management.iam.service;

/**
 * Service managing cryptographically secure One-Time Passwords, retry tracking, and email dispatch.
 */
public interface OtpService {

    /**
     * Generate a 6-digit OTP, persist with 5-minute validity, and dispatch to email.
     */
    String generateAndSendOtp(String email, String purpose);

    /**
     * Verify a submitted OTP against email and purpose, rate-limiting failed attempts.
     */
    boolean verifyOtp(String email, String otpCode, String purpose);
}
