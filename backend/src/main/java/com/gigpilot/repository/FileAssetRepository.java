package com.gigpilot.repository;

import com.gigpilot.model.FileAsset;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FileAssetRepository extends MongoRepository<FileAsset, String> {
    List<FileAsset> findByTask(String taskId);
}
