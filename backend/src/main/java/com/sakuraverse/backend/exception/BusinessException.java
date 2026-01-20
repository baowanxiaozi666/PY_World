package com.sakuraverse.backend.exception;

import lombok.Getter;

/**
 * Custom exception for business logic errors.
 * These are expected errors (e.g. "User not found", "Invalid password") that should return a 400 status.
 */
@Getter
public class BusinessException extends RuntimeException {
    private final Integer code;

    public BusinessException(String message) {
        super(message);
        this.code = 400; // Default error code
    }

    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
    }
}