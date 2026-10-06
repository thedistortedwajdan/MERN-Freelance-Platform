package com.gigpilot.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexType;
import org.springframework.data.mongodb.core.index.GeoSpatialIndexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

@Getter
@Setter
@Document("tasks")
public class Task {
    @Id
    private String id;
    private String title;
    private String description;
    /** The employer's budget. */
    private Double price;
    /** The price agreed with the freelancer (proposal price, or the budget for instant accepts). */
    private Double agreedPrice;
    private String location;
    private String category;
    private List<String> skills = new ArrayList<>();
    private Instant deadline;
    @GeoSpatialIndexed(type = GeoSpatialIndexType.GEO_2DSPHERE)
    private GeoJsonPoint geo;
    private TaskStatus status = TaskStatus.open;
    @Field(targetType = FieldType.OBJECT_ID)
    private String employer;
    @Field(targetType = FieldType.OBJECT_ID)
    private String freelancer;
    /** File ids of employer-provided attachments. */
    private List<String> attachments = new ArrayList<>();
    /** File ids of freelancer deliverables. */
    private List<String> deliverables = new ArrayList<>();
    private String submissionNote;
    private String revisionNote;
    private String cancelReason;
    /** Hidden by a moderator: excluded from search and from non-participants. */
    private boolean hidden;
    private Instant submittedAt;
    private Instant completedAt;
    @CreatedDate
    private Instant createdAt;
    @LastModifiedDate
    private Instant updatedAt;
}
