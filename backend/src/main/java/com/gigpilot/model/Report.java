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
@Document("reports")
public class Report {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String reporter;
    private ReportTarget targetType;
    private String targetId;
    private String reason;
    private ReportStatus status = ReportStatus.open;
    private String resolutionNote;
    @Field(targetType = FieldType.OBJECT_ID)
    private String resolvedBy;
    private Instant resolvedAt;
    @CreatedDate
    private Instant createdAt;
}
