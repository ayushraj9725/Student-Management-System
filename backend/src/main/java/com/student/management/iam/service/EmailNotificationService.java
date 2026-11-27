package com.student.management.iam.service;

import java.util.concurrent.CompletableFuture;

/**
 * Service for asynchronous dispatch of emails and notifications,
 * decoupling external network I/O from database transactional boundaries.
 */
public interface EmailNotificationService {

    /**
     * Dispatches an email asynchronously on the background worker thread pool.
     *
     * @param toEmail      Recipient email address
     * @param subject      Subject line
     * @param plainText    Fallback plain text content
     * @param htmlContent  Rendered HTML email body
     * @return CompletableFuture resolving to true if sent or simulated successfully
     */
    CompletableFuture<Boolean> sendEmailAsync(String toEmail, String subject, String plainText, String htmlContent);
}
