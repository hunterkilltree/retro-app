package com.retro.service;

import com.retro.exception.AiSuggestionUnavailableException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GroupTitleSuggestionServiceTest {

    @Test
    void toTitle_keepsShortTitleAsIs() {
        assertThat(GroupTitleSuggestionService.toTitle("Deployment Pain")).isEqualTo("Deployment Pain");
    }

    @Test
    void toTitle_truncatesToThreeWords() {
        assertThat(GroupTitleSuggestionService.toTitle("Slow and Flaky CI Pipeline"))
                .isEqualTo("Slow and Flaky");
    }

    @Test
    void toTitle_stripsQuotesPrefixPunctuationAndExtraLines() {
        assertThat(GroupTitleSuggestionService.toTitle("Title: \"Team Communication.\"\nBecause the notes..."))
                .isEqualTo("Team Communication");
    }

    @Test
    void toTitle_handlesBlankInput() {
        assertThat(GroupTitleSuggestionService.toTitle("   ")).isEmpty();
        assertThat(GroupTitleSuggestionService.toTitle(null)).isEmpty();
    }

    @Test
    void buildPrompt_includesColumnAndNotes() {
        String prompt = GroupTitleSuggestionService.buildPrompt("Went Wrong", List.of("Builds slow", "Tests flaky"));
        assertThat(prompt).contains("\"Went Wrong\"", "- Builds slow", "- Tests flaky", "At most 3 words");
    }

    @Test
    void suggestTitle_withoutApiKey_throwsUnavailable() {
        var service = new GroupTitleSuggestionService("", "gemini-3.8-flash", "http://localhost");
        assertThat(service.isEnabled(null)).isFalse();
        assertThat(service.isEnabled("  ")).isFalse();
        assertThatThrownBy(() -> service.suggestTitle(null, "Col", List.of("a note")))
                .isInstanceOf(AiSuggestionUnavailableException.class);
    }

    @Test
    void isEnabled_withRoomKeyOrServerKey() {
        var noServerKey = new GroupTitleSuggestionService("", "gemini-3.8-flash", "http://localhost");
        assertThat(noServerKey.isEnabled("room-key")).isTrue();

        var withServerKey = new GroupTitleSuggestionService("server-key", "gemini-3.8-flash", "http://localhost");
        assertThat(withServerKey.isEnabled(null)).isTrue();
    }

    @Test
    void parseResponse_parsesJsonRegardlessOfContentType() {
        var parsed = GroupTitleSuggestionService.parseResponse(
                "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Team Morale\"}]}}]}");
        assertThat(parsed.get("candidates")).isInstanceOf(List.class);
    }

    @Test
    void parseResponse_rejectsEmptyOrNonJson() {
        assertThatThrownBy(() -> GroupTitleSuggestionService.parseResponse(""))
                .isInstanceOf(AiSuggestionUnavailableException.class);
        assertThatThrownBy(() -> GroupTitleSuggestionService.parseResponse("<html>oops</html>"))
                .isInstanceOf(AiSuggestionUnavailableException.class);
    }
}
