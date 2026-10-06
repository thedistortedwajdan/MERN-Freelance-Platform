package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.FileView;
import com.gigpilot.model.FileAsset;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.FileService;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Upload first ({@code POST /api/files}, multipart field {@code file}), then pass the returned ids as
 * {@code attachmentIds} when creating a task or submitting work.
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {
    private final FileService files;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FileView upload(@AuthenticationPrincipal AuthUser user, @RequestParam("file") MultipartFile file) {
        return files.upload(user.id(), file);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        FileService.Download download = files.download(user, id);
        FileAsset asset = download.asset();
        boolean image = asset.getContentType().startsWith("image/");
        ContentDisposition disposition = (image ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(asset.getOriginalName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(asset.getContentType()))
                .contentLength(asset.getSize())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(download.resource());
    }
}
