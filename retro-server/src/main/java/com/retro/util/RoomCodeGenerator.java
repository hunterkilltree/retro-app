package com.retro.util;

import java.security.SecureRandom;

public final class RoomCodeGenerator {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final char[] LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".toCharArray();
    private static final char[] DIGITS = "0123456789".toCharArray();

    private RoomCodeGenerator() {}

    // Format: XXX-99X
    public static String generate() {
        char a = LETTERS[RANDOM.nextInt(LETTERS.length)];
        char b = LETTERS[RANDOM.nextInt(LETTERS.length)];
        char c = LETTERS[RANDOM.nextInt(LETTERS.length)];
        char d1 = DIGITS[RANDOM.nextInt(DIGITS.length)];
        char d2 = DIGITS[RANDOM.nextInt(DIGITS.length)];
        char e = LETTERS[RANDOM.nextInt(LETTERS.length)];
        return new String(new char[]{a, b, c, '-', d1, d2, e});
    }
}

