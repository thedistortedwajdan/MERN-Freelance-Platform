package com.gigpilot.model;

import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

@Getter
@Setter
@Document("files")
public class FileAsset {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String owner;
    private String originalName;
    private String contentType;
    private long size;
    /** Generated name on disk; never derived from user input. */
    private String storedName;
    @Field(targetType = FieldType.OBJECT_ID)
    private String task;
    private FileKind kind;
    @CreatedDate
    private Instant createdAt;
}
