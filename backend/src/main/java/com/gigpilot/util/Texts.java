package com.gigpilot.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public final class Texts {
    private Texts() {}

    public static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /** Trims, drops blanks and duplicates (case-insensitive) and caps the count and length of each entry. */
    public static List<String> cleanList(List<String> in, int maxItems, int maxLength) {
        if (in == null) return new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        List<String> out = new ArrayList<>();
        for (String raw : in) {
            String t = trimToNull(raw);
            if (t == null) continue;
            if (t.length() > maxLength) t = t.substring(0, maxLength);
            if (seen.add(t.toLowerCase()) && out.size() < maxItems) out.add(t);
        }
        return out;
    }
}
