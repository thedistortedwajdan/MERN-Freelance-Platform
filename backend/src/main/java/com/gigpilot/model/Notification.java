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
@Document("notifications")
@CompoundIndex(name = "user_id_desc", def = "{'user': 1, '_id': -1}")
public class Notification {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String user;
    private NotificationType type;
    private String message;
    @Field(targetType = FieldType.OBJECT_ID)
    private String task;
    private boolean read;
    @CreatedDate
    private Instant createdAt;
}
