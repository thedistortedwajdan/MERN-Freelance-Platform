package com.gigpilot.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

class UtilTest {
    @Test
    void cleanListTrimsDedupesAndCaps() {
        List<String> in = Arrays.asList(" Java ", "java", "", null, "Spring", "x".repeat(100));
        List<String> out = Texts.cleanList(in, 3, 10);
        assertEquals(List.of("Java", "Spring", "xxxxxxxxxx"), out);
    }

    @Test
    void trimToNullTurnsBlankIntoNull() {
        assertNull(Texts.trimToNull("   "));
        assertEquals("a", Texts.trimToNull(" a "));
    }

    @Test
    void tokensAreRandomAndHashesAreStable() {
        String a = Tokens.random();
        assertNotEquals(a, Tokens.random());
        assertEquals(Tokens.hash(a), Tokens.hash(a));
        assertEquals(64, Tokens.hash(a).length());
    }

    @Test
    void pagesClampSizeAndPage() {
        var p = Pages.of(-5, 10_000, Sort.unsorted());
        assertEquals(0, p.getPageNumber());
        assertEquals(Pages.MAX_SIZE, p.getPageSize());
    }
}
