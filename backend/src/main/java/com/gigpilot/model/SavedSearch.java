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
@Document("saved_searches")
public class SavedSearch {
    @Id
    private String id;
    @Field(targetType = FieldType.OBJECT_ID)
    private String user;
    private String name;
    private String q;
    private String location;
    private String category;
    private java.util.List<String> skills = new java.util.ArrayList<>();
    private Double minPrice;
    private Double maxPrice;
    private Double latitude;
    private Double longitude;
    private Double radiusKm;
    @CreatedDate
    private Instant createdAt;
}
