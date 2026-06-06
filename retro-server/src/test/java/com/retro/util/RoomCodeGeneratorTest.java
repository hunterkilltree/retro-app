package com.retro.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.RepeatedTest;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class RoomCodeGeneratorTest {

    // Format: XXX-99X  → three uppercase letters, dash, two digits, one uppercase letter
    private static final Pattern FORMAT = Pattern.compile("^[A-Z]{3}-[0-9]{2}[A-Z]$");

    @RepeatedTest(200)
    void generatesCodeMatchingExpectedFormat() {
        String code = RoomCodeGenerator.generate();
        assertThat(code).hasSize(7);
        assertThat(code.charAt(3)).isEqualTo('-');
        assertThat(FORMAT.matcher(code).matches())
                .as("code '%s' should match XXX-99X", code)
                .isTrue();
    }

    @Test
    void generatesReasonablyUniqueCodes() {
        // With ~26^4 * 100 ≈ 45M possibilities, 1000 draws should rarely collide.
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            seen.add(RoomCodeGenerator.generate());
        }
        assertThat(seen.size()).isGreaterThan(990);
    }
}
