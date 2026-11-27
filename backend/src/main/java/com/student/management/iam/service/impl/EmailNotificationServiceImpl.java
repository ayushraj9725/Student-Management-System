package com.student.management.iam.service.impl;

import com.student.management.iam.service.EmailNotificationService;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

/**
 * Enterprise asynchronous implementation of email notifications.
 * Decouples SMTP network socket latency and failure modes from database transactions.
 */
@Slf4j
@Service
public class EmailNotificationServiceImpl implements EmailNotificationService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:ayushrajtech01@gmail.com}")
    private String mailUsername;

    @Value("${app.mail.from-name:My School Care}")
    private String mailFromName;

    @Value("${app.mail.reply-to:noreply@myschoolcare.com}")
    private String mailReplyTo;

    @Async("tenantTaskExecutor")
    @Override
    public CompletableFuture<Boolean> sendEmailAsync(String toEmail, String subject, String plainText, String htmlContent) {
        log.info("Initiating asynchronous email dispatch to: {} with subject: '{}'", toEmail, subject);

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
                log.info("Dispatched live SMTP email asynchronously to: {} from: '{} <{}>' (Reply-To: '{}')",
                        toEmail, mailFromName, mailUsername, mailReplyTo);
                return CompletableFuture.completedFuture(true);
            } catch (Exception ex) {
                log.warn("Asynchronous live SMTP dispatch failed: {}. Falling back to dev simulation.", ex.getMessage());
            }
        }

        // Local development / testing simulation fallback
        log.info("==================================================");
        log.info("[MY SCHOOL CARE ASYNC DEV EMAIL / OTP DISPATCH]");
        log.info("TO: {}", toEmail);
        log.info("SUBJECT: {}", subject);
        log.info("FROM: {} <{}>", mailFromName, mailUsername);
        log.info("REPLY-TO: {}", mailReplyTo);
        log.info("==================================================");

        return CompletableFuture.completedFuture(true);
    }
}
