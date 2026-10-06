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
@Document("verification_tokens")
public class VerificationToken {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String user;
    private TokenType type;
    @Indexed(unique = true)
    private String tokenHash;
    @Indexed(expireAfter = "0s")
    private Instant expiresAt;
    private boolean used;
    @CreatedDate
    private Instant createdAt;
}
