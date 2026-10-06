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
@Document("disputes")
public class Dispute {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String task;
    @Field(targetType = FieldType.OBJECT_ID)
    private String openedBy;
    @Field(targetType = FieldType.OBJECT_ID)
    private String against;
    private String reason;
    private DisputeStatus status = DisputeStatus.open;
    private DisputeOutcome outcome = DisputeOutcome.none;
    private String resolutionNote;
    @Field(targetType = FieldType.OBJECT_ID)
    private String resolvedBy;
    private Instant resolvedAt;
    @CreatedDate
    private Instant createdAt;
}
