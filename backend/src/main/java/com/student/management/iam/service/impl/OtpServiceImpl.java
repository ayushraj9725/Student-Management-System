package com.student.management.iam.service.impl;

import com.student.management.exception.BadRequestException;
import com.student.management.iam.security.entity.OtpVerification;
import com.student.management.iam.security.repository.OtpVerificationRepository;
import com.student.management.iam.service.OtpService;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.ZonedDateTime;

/**
 * Concrete implementation for OTP generation, rate limiting, and email dispatch.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OtpServiceImpl implements OtpService {

    private final OtpVerificationRepository otpVerificationRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:ayushrajtech01@gmail.com}")
    private String mailUsername;

    @Value("${app.mail.from-name:My School Care}")
    private String mailFromName;

    @Value("${app.mail.reply-to:noreply@myschoolcare.com}")
    private String mailReplyTo;

    @Value("${app.mail.frontend-url:http://localhost:4000}")
    private String frontendBaseUrl;

    private static final int MAX_ATTEMPTS = 3;

    @Override
    @Transactional
    public String generateAndSendOtp(String email, String purpose) {
        String cleanEmail = email != null ? email.trim().toLowerCase() : "";
        log.info("Generating OTP for email: {} with purpose: {}", cleanEmail, purpose);

        // Invalidate previous unverified OTPs for this email and purpose
        otpVerificationRepository.deleteAllByEmailIgnoreCase(cleanEmail);

        // Generate 6-digit cryptographic random code (100000 - 999999)
        int codeInt = 100000 + secureRandom.nextInt(900000);
        String otpCode = String.valueOf(codeInt);

        int validityMinutes = "ONBOARDING_SETUP".equalsIgnoreCase(purpose) ? 15 : 5;

        OtpVerification verification = OtpVerification.builder()
                .email(cleanEmail)
                .otpCode(otpCode)
                .purpose(purpose)
                .expiresAt(ZonedDateTime.now().plusMinutes(validityMinutes))
                .attemptCount(0)
                .isVerified(false)
                .build();

        otpVerificationRepository.save(verification);

        // Dispatch Email
        sendOtpEmail(cleanEmail, otpCode, purpose);

        return otpCode;
    }

    @Override
    @Transactional
    public boolean verifyOtp(String email, String otpCode, String purpose) {
        String cleanEmail = email != null ? email.trim().toLowerCase() : "";
        String cleanOtp = otpCode != null ? otpCode.replaceAll("\\s+", "").trim() : "";
        log.info("Verifying OTP for email: {} with purpose: {}", cleanEmail, purpose);

        OtpVerification verification = otpVerificationRepository
                .findTopByEmailIgnoreCaseAndPurposeAndIsVerifiedFalseOrderByIdDesc(cleanEmail, purpose)
                .or(() -> otpVerificationRepository.findTopByEmailIgnoreCaseAndIsVerifiedFalseOrderByIdDesc(cleanEmail))
                .orElseThrow(() -> new BadRequestException("No active OTP request found for this email (" + cleanEmail + "). Please request a new code."));

        if (verification.isExpired()) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        int currentAttempts = verification.getAttemptCount() != null ? verification.getAttemptCount() + 1 : 1;
        verification.setAttemptCount(currentAttempts);

        if (currentAttempts > MAX_ATTEMPTS) {
            otpVerificationRepository.delete(verification);
            throw new BadRequestException("Maximum verification attempts exceeded. Please request a new OTP.");
        }

        if (!verification.getOtpCode().equals(cleanOtp)) {
            otpVerificationRepository.save(verification);
            throw new BadRequestException("Invalid OTP code. " + (MAX_ATTEMPTS - currentAttempts) + " attempts remaining.");
        }

        verification.setIsVerified(true);
        otpVerificationRepository.save(verification);
        log.info("OTP successfully verified for email: {}", cleanEmail);
        return true;
    }

    private void sendOtpEmail(String toEmail, String code, String purpose) {
        boolean isOnboarding = "ONBOARDING_SETUP".equalsIgnoreCase(purpose);
        String subject = isOnboarding
                ? "Congratulations! Your School Has Been Onboarded on My School Care"
                : "My School Care - Security Verification Code";

        String setupUrl = frontendBaseUrl + "/setup-password?email=" + toEmail;

        String plainText = isOnboarding
                ? "Congratulations! Your school has been onboarded by Platform Administration on My School Care.\n\n"
                + "To set up your administrator password and start managing your workspace, please visit:\n"
                + setupUrl + "\n\n"
                + "Your 6-digit security verification code is: [ " + code + " ]\n\n"
                + "This verification code is valid for 15 minutes.\n"
                + "Welcome aboard,\nMy School Care Platform Team"
                : "Your My School Care security verification code is: " + code + "\n\n"
                + "This code is valid for 5 minutes. If you did not request this code, please ignore this email.";

        String htmlContent = buildHtmlEmail(toEmail, code, isOnboarding, setupUrl);

        if (mailSender != null) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

                helper.setTo(toEmail);
                helper.setSubject(subject);
                helper.setFrom(new InternetAddress(mailUsername, mailFromName));
                helper.setReplyTo(new InternetAddress(mailReplyTo, mailFromName + " No-Reply"));
                helper.setText(plainText, htmlContent);

                mailSender.send(mimeMessage);
                log.info("Dispatched live SMTP email to: {} from: '{} <{}>' (Reply-To: '{}')",
                        toEmail, mailFromName, mailUsername, mailReplyTo);
                return;
            } catch (Exception ex) {
                log.warn("Live SMTP dispatch failed: {}. Falling back to dev simulation.", ex.getMessage());
            }
        }

        // Local development / testing simulation fallback
        log.info("==================================================");
        log.info("[MY SCHOOL CARE DEV EMAIL / OTP DISPATCH]");
        log.info("TO: {}", toEmail);
        log.info("SUBJECT: {}", subject);
        log.info("CODE: {}", code);
        log.info("PURPOSE: {}", purpose);
        log.info("FROM: {} <{}>", mailFromName, mailUsername);
        log.info("REPLY-TO: {}", mailReplyTo);
        log.info("==================================================");
    }

    private String buildHtmlEmail(String toEmail, String code, boolean isOnboarding, String setupUrl) {
        String title = isOnboarding ? "Welcome to My School Care" : "Security Verification Code";
        String message = isOnboarding
                ? "Congratulations! Your school tenant has been successfully provisioned by the platform administration. Use the verification code below to set up your administrator password and activate your institutional workspace."
                : "A request was made to verify your account credentials. Please enter the security verification code below to complete the verification process.";

        String validityText = isOnboarding ? "15 minutes" : "5 minutes";

        String actionButton = isOnboarding
                ? "<div style='text-align: center; margin: 28px 0;'>"
                + "<a href='" + setupUrl + "' style='background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);'>Set Up Administrator Password &rarr;</a>"
                + "</div>"
                : "";

        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>"
                + "<body style='margin:0; padding:0; background-color:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color:#1e293b;'>"
                + "<table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f1f5f9; padding: 32px 16px;'>"
                + "  <tr>"
                + "    <td align='center'>"
                + "      <table width='100%' cellpadding='0' cellspacing='0' style='max-width: 560px; background-color:#ffffff; border-radius: 14px; overflow:hidden; box-shadow: 0 10px 25px -5px rgba(15,23,42,0.08); border: 1px solid #e2e8f0;'>"
                + "        <!-- Top Gradient Accent -->"
                + "        <tr><td style='height: 4px; background: linear-gradient(90deg, #0284c7 0%, #38bdf8 35%, #f472b6 65%, #db2777 100%);'></td></tr>"
                + "        <!-- Header -->"
                + "        <tr>"
                + "          <td style='padding: 28px 32px 16px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;'>"
                + "            <h2 style='margin: 0; color: #0284c7; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;'>My School Care</h2>"
                + "            <p style='margin: 4px 0 0 0; color: #64748b; font-size: 13px;'>Institutional Multi-Tenant Management Platform</p>"
                + "          </td>"
                + "        </tr>"
                + "        <!-- Body -->"
                + "        <tr>"
                + "          <td style='padding: 32px 32px 24px 32px;'>"
                + "            <h3 style='margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 700;'>" + title + "</h3>"
                + "            <p style='margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;'>" + message + "</p>"
                + "            <!-- Code Box -->"
                + "            <div style='background: #f0f9ff; border: 1.5px dashed #0284c7; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;'>"
                + "              <div style='font-size: 12px; font-weight: 600; color: #0369a1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;'>Your 6-Digit Security Code</div>"
                + "              <div style='font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0284c7; font-family: Consolas, monospace;'>" + code + "</div>"
                + "              <div style='font-size: 12px; color: #64748b; margin-top: 8px;'>Valid for <strong>" + validityText + "</strong> &bull; Do not share this code</div>"
                + "            </div>"
                + actionButton
                + "            <p style='margin: 20px 0 0 0; color: #64748b; font-size: 12px; line-height: 1.5;'>"
                + "              If you did not initiate this request or have questions about your institutional workspace, please reach out to your Platform Administrator."
                + "            </p>"
                + "          </td>"
                + "        </tr>"
                + "        <!-- Footer -->"
                + "        <tr>"
                + "          <td style='background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;'>"
                + "            This is an automated security dispatch from <strong>My School Care Platform</strong>.<br/>"
                + "            Replies to this email are routed to <code>" + mailReplyTo + "</code> and are not monitored."
                + "          </td>"
                + "        </tr>"
                + "      </table>"
                + "    </td>"
                + "  </tr>"
                + "</table>"
                + "</body>"
                + "</html>";
    }
}
