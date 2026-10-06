package com.gigpilot.service;

import com.gigpilot.dto.Dtos.FileView;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.FileAsset;
import com.gigpilot.model.FileKind;
import com.gigpilot.model.Role;
import com.gigpilot.model.Task;
import com.gigpilot.repository.FileAssetRepository;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.security.AuthUser;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Local-disk file storage for task attachments and deliverables. Files are stored under random names; the
 * original name only lives in the database.
 */
@Service
public class FileService {
    public record Download(FileAsset asset, Resource resource) {}

    public static final int MAX_FILES_PER_LIST = 10;

    private static final Logger log = LoggerFactory.getLogger(FileService.class);
    private static final Set<String> TYPES = Set.of(
            "image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf", "text/plain",
            "application/zip", "application/x-zip-compressed", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    private static final Set<String> EXTENSIONS =
            Set.of("png", "jpg", "jpeg", "gif", "webp", "pdf", "txt", "zip", "doc", "docx", "xlsx");

    private final FileAssetRepository files;
    private final TaskRepository tasks;
    private final Path root;

    public FileService(
            FileAssetRepository files, TaskRepository tasks, @Value("${app.storage.dir}") String storageDir) {
        this.files = files;
        this.tasks = tasks;
        this.root = Path.of(storageDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create storage directory " + root, e);
        }
    }

    public FileView upload(String ownerId, MultipartFile upload) {
        if (upload == null || upload.isEmpty()) {
            throw ApiException.badRequest("File is empty");
        }
        String contentType = upload.getContentType() == null
                ? ""
                : upload.getContentType().split(";")[0].trim().toLowerCase(Locale.ROOT);
        String name = baseName(upload.getOriginalFilename());
        String extension = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        if (!TYPES.contains(contentType) || !EXTENSIONS.contains(extension)) {
            throw ApiException.badRequest("Unsupported file type");
        }

        String stored = UUID.randomUUID().toString();
        try (InputStream in = upload.getInputStream()) {
            Files.copy(in, root.resolve(stored), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Failed to store upload", e);
            throw new UncheckedIOException(e);
        }

        FileAsset asset = new FileAsset();
        asset.setOwner(ownerId);
        asset.setOriginalName(name);
        asset.setContentType(contentType);
        asset.setSize(upload.getSize());
        asset.setStoredName(stored);
        files.save(asset);
        return view(asset);
    }

    public Download download(AuthUser user, String id) {
        Ids.require(id, "file");
        FileAsset asset = files.findById(id).orElseThrow(() -> ApiException.notFound("File not found"));
        if (!canRead(user, asset)) {
            throw ApiException.forbidden("Access denied");
        }
        Path path = root.resolve(asset.getStoredName()).normalize();
        if (!path.startsWith(root) || !Files.exists(path)) {
            throw ApiException.notFound("File not found");
        }
        return new Download(asset, new FileSystemResource(path));
    }

    /** Validates that the caller owns each file and that it is not yet attached anywhere. */
    public List<FileAsset> claim(String userId, List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<String> distinct = ids.stream().distinct().toList();
        if (distinct.size() > MAX_FILES_PER_LIST) {
            throw ApiException.badRequest("Too many files (max " + MAX_FILES_PER_LIST + ")");
        }
        List<FileAsset> claimed = new ArrayList<>();
        for (String id : distinct) {
            Ids.require(id, "file");
            FileAsset asset = files.findById(id).orElseThrow(() -> ApiException.badRequest("File not found: " + id));
            if (!userId.equals(asset.getOwner())) {
                throw ApiException.forbidden("You can only attach your own files");
            }
            if (asset.getTask() != null) {
                throw ApiException.badRequest("File is already attached to a task");
            }
            claimed.add(asset);
        }
        return claimed;
    }

    public void link(List<FileAsset> assets, String taskId, FileKind kind) {
        for (FileAsset asset : assets) {
            asset.setTask(taskId);
            asset.setKind(kind);
            files.save(asset);
        }
    }

    public void delete(List<String> ids) {
        if (ids == null) {
            return;
        }
        for (FileAsset asset : files.findAllById(ids)) {
            remove(asset);
        }
    }

    public void deleteForTask(String taskId) {
        files.findByTask(taskId).forEach(this::remove);
    }

    private void remove(FileAsset asset) {
        try {
            Files.deleteIfExists(root.resolve(asset.getStoredName()).normalize());
        } catch (IOException e) {
            log.warn("Could not delete file {}", asset.getStoredName(), e);
        }
        files.delete(asset);
    }

    private boolean canRead(AuthUser user, FileAsset asset) {
        if (user.role() == Role.admin || user.id().equals(asset.getOwner())) {
            return true;
        }
        if (asset.getTask() == null) {
            return false;
        }
        Task task = tasks.findById(asset.getTask()).orElse(null);
        if (task == null) {
            return false;
        }
        boolean participant = user.id().equals(task.getEmployer()) || user.id().equals(task.getFreelancer());
        if (asset.getKind() == FileKind.deliverable) {
            return participant;
        }
        return participant || !task.isHidden();
    }

    private static String baseName(String original) {
        String name = original == null ? "file" : original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).trim();
        if (name.isEmpty()) {
            name = "file";
        }
        return name.length() > 150 ? name.substring(name.length() - 150) : name;
    }

    static FileView view(FileAsset a) {
        return new FileView(a.getId(), a.getOriginalName(), a.getContentType(), a.getSize());
    }
}
