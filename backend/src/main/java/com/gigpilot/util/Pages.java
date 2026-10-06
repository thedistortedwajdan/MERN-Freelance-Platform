package com.gigpilot.util;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;

/**
 * Lists stay plain JSON arrays (so existing clients keep working); paging metadata travels in the
 * {@code X-Total-Count} and {@code X-Total-Pages} headers.
 */
public final class Pages {
    public static final int DEFAULT_SIZE = 50;
    public static final int MAX_SIZE = 100;

    private Pages() {}

    public static Pageable of(int page, int size, Sort sort) {
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_SIZE), sort);
    }

    public static <T> ResponseEntity<List<T>> ok(Page<T> page) {
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(page.getTotalElements()))
                .header("X-Total-Pages", String.valueOf(page.getTotalPages()))
                .body(page.getContent());
    }
}
