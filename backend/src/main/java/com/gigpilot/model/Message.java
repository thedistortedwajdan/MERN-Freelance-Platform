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
@Document("messages")
@CompoundIndex(name = "task_id", def = "{'task': 1, '_id': 1}")
public class Message {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String task;
    @Field(targetType = FieldType.OBJECT_ID)
    private String sender;
    @Field(targetType = FieldType.OBJECT_ID)
    private String recipient;
    private String text;
    private Instant readAt;
    @CreatedDate
    private Instant createdAt;
}
