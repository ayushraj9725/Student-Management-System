package com.student.management.shared.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class TenantSuspendedException extends RuntimeException {
    public TenantSuspendedException(String message) {
        super(message);
    }
}
