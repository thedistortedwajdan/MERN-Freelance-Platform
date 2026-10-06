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
@Document("audit_logs")
public class AuditLog {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String actor;
    private String action;
    private String targetType;
    private String targetId;
    private String details;
    @CreatedDate
    private Instant createdAt;
}
