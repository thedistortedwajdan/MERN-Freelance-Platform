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
@Document("favorites")
@CompoundIndex(name = "user_task", def = "{'user': 1, 'task': 1}", unique = true)
public class Favorite {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String user;
    @Field(targetType = FieldType.OBJECT_ID)
    private String task;
    @CreatedDate
    private Instant createdAt;
}
