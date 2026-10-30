package com.student.management.iam.service;

import com.student.management.iam.dto.request.*;
import com.student.management.iam.dto.response.AuthTokenResponse;
import com.student.management.iam.dto.response.OtpVerificationResponse;

/**
 * Public service interface for user authentication, token rotation, and password lifecycle management.
 */
public interface AuthService {

    AuthTokenResponse login(LoginRequest request);

    AuthTokenResponse refreshToken(RefreshTokenRequest request);

    void forgotPassword(ForgotPasswordRequest request);

    OtpVerificationResponse verifyOtp(VerifyOtpRequest request);

    void resetPassword(ResetPasswordRequest request);

    void logout(String refreshToken);
}
