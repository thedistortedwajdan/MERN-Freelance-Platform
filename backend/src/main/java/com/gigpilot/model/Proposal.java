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
@Document("proposals")
@CompoundIndex(name = "task_freelancer", def = "{'task': 1, 'freelancer': 1}", unique = true)
public class Proposal {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String task;
    @Field(targetType = FieldType.OBJECT_ID)
    private String freelancer;
    private Double price;
    private String message;
    private Integer etaDays;
    private ProposalStatus status = ProposalStatus.pending;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;
}
