package com.retro.exception;

/** Thrown when an AI title suggestion cannot be produced (no API key, upstream error, empty reply). */
public class AiSuggestionUnavailableException extends RuntimeException {
    public AiSuggestionUnavailableException(String message) {
        super(message);
    }

    public AiSuggestionUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
