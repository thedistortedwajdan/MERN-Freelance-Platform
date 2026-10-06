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
@Document("ratings")
@CompoundIndex(name = "from_to_task", def = "{'from': 1, 'to': 1, 'task': 1}", unique = true)
public class Rating {
    @Id
    private String id;
    @Field(name = "from", targetType = FieldType.OBJECT_ID)
    private String from;
    @Field(name = "to", targetType = FieldType.OBJECT_ID)
    private String to;
    @Field(targetType = FieldType.OBJECT_ID)
    private String task;
    private int score;
    private String comment;
    /** The rated user's public reply. */
    private String reply;
    private Instant repliedAt;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;
}
