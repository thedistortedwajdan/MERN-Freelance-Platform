package com.gigpilot.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gigpilot.model.AccountStatus;
import com.gigpilot.model.DisputeOutcome;
import com.gigpilot.model.DisputeStatus;
import com.gigpilot.model.NotificationType;
import com.gigpilot.model.ProposalStatus;
import com.gigpilot.model.ReportStatus;
import com.gigpilot.model.ReportTarget;
import com.gigpilot.model.Role;
import com.gigpilot.model.TaskStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Request/response shapes. Responses keep the {@code _id} naming the React frontend
 * already relies on.
 */
public final class Dtos {
    private Dtos() {}

    // ---- common
    public record MessageResponse(String message) {}

    public record ErrorResponse(String error) {}

    public record UserRef(@JsonProperty("_id") String id, String name) {}

    public record FileView(@JsonProperty("_id") String id, String name, String contentType, long size) {}

    // ---- auth
    public record RegisterRequest(
            @NotBlank(message = "Name is required") @Size(max = 100, message = "Name is too long") String name,
            @NotBlank(message = "Email is required") @Size(max = 200, message = "Email is too long") String email,
            @NotBlank(message = "Password is required")
            @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters") String password,
            @NotNull(message = "A valid role is required") Role role) {}

    public record LoginRequest(
            @NotBlank(message = "Email is required") String email,
            @NotBlank(message = "Password is required") String password) {}

    /** Includes both {@code id} and {@code _id} so every frontend lookup works. */
    public record LoginUser(String id, @JsonProperty("_id") String underscoreId, String name, Role role) {}

    public record LoginResponse(String token, String refreshToken, LoginUser user) {}

    public record RefreshRequest(@NotBlank(message = "Refresh token is required") String refreshToken) {}

    public record ForgotPasswordRequest(@NotBlank(message = "Email is required") String email) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "Token is required") String token,
            @NotBlank(message = "Password is required")
            @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters") String password) {}

    public record VerifyEmailRequest(@NotBlank(message = "Token is required") String token) {}

    // ---- tasks
    public record TaskRequest(
            @NotBlank(message = "Title is required") @Size(max = 200, message = "Title is too long") String title,
            @NotBlank(message = "Description is required")
            @Size(max = 5000, message = "Description is too long") String description,
            @NotNull(message = "A valid price is required")
            @PositiveOrZero(message = "Price cannot be negative") Double price,
            @Size(max = 200, message = "Location is too long") String location,
            @Size(max = 60, message = "Category is too long") String category,
            List<String> skills,
            Instant deadline,
            @Min(value = -90, message = "Latitude must be between -90 and 90")
            @Max(value = 90, message = "Latitude must be between -90 and 90") Double latitude,
            @Min(value = -180, message = "Longitude must be between -180 and 180")
            @Max(value = 180, message = "Longitude must be between -180 and 180") Double longitude,
            List<String> attachmentIds) {}

    public record TaskView(
            @JsonProperty("_id") String id,
            String title,
            String description,
            Double price,
            Double agreedPrice,
            String location,
            String category,
            List<String> skills,
            Instant deadline,
            Double latitude,
            Double longitude,
            TaskStatus status,
            UserRef employer,
            UserRef freelancer,
            List<FileView> attachments,
            List<FileView> deliverables,
            String submissionNote,
            String revisionNote,
            String cancelReason,
            boolean hidden,
            Instant submittedAt,
            Instant completedAt,
            Instant createdAt,
            Instant updatedAt) {}

    public record AcceptResponse(String message, TaskView task) {}

    public record SubmitRequest(
            @Size(max = 2000, message = "Note is too long") String note, List<String> attachmentIds) {}

    public record CancelRequest(@Size(max = 500, message = "Reason is too long") String reason) {}

    public record RevisionRequest(
            @NotBlank(message = "Please explain what needs to change")
            @Size(max = 2000, message = "Note is too long") String note) {}

    /** Search filters shared by {@code GET /tasks} and saved searches. */
    public record TaskSearch(
            String q,
            String location,
            String category,
            List<String> skills,
            Double minPrice,
            Double maxPrice,
            Double latitude,
            Double longitude,
            Double radiusKm) {}

    // ---- proposals
    public record ProposalRequest(
            @NotNull(message = "Price is required") @Positive(message = "Price must be positive") Double price,
            @NotBlank(message = "A cover message is required")
            @Size(max = 2000, message = "Message is too long") String message,
            @Min(value = 1, message = "ETA must be at least 1 day") @Max(value = 3650, message = "ETA is too long") Integer etaDays) {}

    public record ProposalView(
            @JsonProperty("_id") String id,
            String taskId,
            String taskTitle,
            UserRef freelancer,
            Double price,
            String message,
            Integer etaDays,
            ProposalStatus status,
            Instant createdAt) {}

    // ---- messaging
    public record MessageRequest(
            @NotBlank(message = "Message cannot be empty")
            @Size(max = 2000, message = "Message is too long") String text) {}

    public record ChatMessage(
            @JsonProperty("_id") String id,
            String task,
            String sender,
            String recipient,
            String text,
            Instant readAt,
            Instant createdAt) {}

    public record ConversationView(
            String taskId, String taskTitle, TaskStatus taskStatus, UserRef otherUser, ChatMessage lastMessage, long unread) {}

    public record UnreadCount(long unread) {}

    // ---- notifications
    public record NotificationView(
            @JsonProperty("_id") String id,
            NotificationType type,
            String message,
            String task,
            boolean read,
            Instant createdAt) {}

    // ---- ratings
    public record RatingRequest(
            @NotBlank(message = "Recipient is required") String to,
            @NotBlank(message = "Task is required") String task,
            @NotNull(message = "Score is required")
            @Min(value = 1, message = "Score must be between 1 and 5")
            @Max(value = 5, message = "Score must be between 1 and 5") Integer score,
            @Size(max = 1000, message = "Comment is too long") String comment) {}

    public record RatingUpdateRequest(
            @NotNull(message = "Score is required")
            @Min(value = 1, message = "Score must be between 1 and 5")
            @Max(value = 5, message = "Score must be between 1 and 5") Integer score,
            @Size(max = 1000, message = "Comment is too long") String comment) {}

    public record ReplyRequest(
            @NotBlank(message = "Reply cannot be empty") @Size(max = 1000, message = "Reply is too long") String reply) {}

    public record RatingView(
            @JsonProperty("_id") String id,
            UserRef from,
            String to,
            String task,
            int score,
            String comment,
            String reply,
            Instant repliedAt,
            Instant createdAt,
            Instant updatedAt) {}

    // ---- users
    public record PortfolioItemDto(
            @NotBlank(message = "Portfolio title is required") @Size(max = 100, message = "Portfolio title is too long") String title,
            @Size(max = 500, message = "Portfolio url is too long") String url,
            @Size(max = 500, message = "Portfolio description is too long") String description) {}

    public record UserView(
            @JsonProperty("_id") String id,
            String name,
            String email,
            Role role,
            AccountStatus status,
            boolean emailVerified,
            String bio,
            String avatarUrl,
            List<String> skills,
            Double hourlyRate,
            String location,
            List<PortfolioItemDto> portfolio,
            Instant createdAt,
            Instant updatedAt) {}

    public record PublicUser(
            @JsonProperty("_id") String id,
            String name,
            Role role,
            String bio,
            String avatarUrl,
            List<String> skills,
            Double hourlyRate,
            String location,
            List<PortfolioItemDto> portfolio) {}

    public record Stats(int totalTasks, int completedTasks, String avgRating, int totalRatings) {}

    public record MeResponse(UserView user, Stats stats) {}

    public record UpdateProfileRequest(
            @Size(max = 100, message = "Name is too long") String name,
            @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters") String password,
            @Size(max = 1000, message = "Bio is too long") String bio,
            @Size(max = 500, message = "Avatar url is too long") String avatarUrl,
            List<String> skills,
            @PositiveOrZero(message = "Hourly rate cannot be negative") Double hourlyRate,
            @Size(max = 200, message = "Location is too long") String location,
            @Valid List<PortfolioItemDto> portfolio) {}

    public record RecentRating(int score, String comment, String from) {}

    public record PublicProfileResponse(
            PublicUser user,
            String avgRating,
            int totalRatings,
            List<RecentRating> recentRatings,
            List<TaskView> completedTasks) {}

    // ---- disputes & reports
    public record DisputeRequest(
            @NotBlank(message = "Please describe the problem")
            @Size(max = 2000, message = "Reason is too long") String reason) {}

    public record ResolveDisputeRequest(
            @NotNull(message = "Resolution is required") DisputeStatus resolution,
            DisputeOutcome outcome,
            @Size(max = 2000, message = "Note is too long") String note) {}

    public record DisputeView(
            @JsonProperty("_id") String id,
            String taskId,
            String taskTitle,
            UserRef openedBy,
            UserRef against,
            String reason,
            DisputeStatus status,
            DisputeOutcome outcome,
            String resolutionNote,
            Instant resolvedAt,
            Instant createdAt) {}

    public record ReportRequest(
            @NotNull(message = "Target type is required") ReportTarget targetType,
            @NotBlank(message = "Target is required") String targetId,
            @NotBlank(message = "Please give a reason") @Size(max = 1000, message = "Reason is too long") String reason) {}

    public record ResolveReportRequest(
            @NotNull(message = "Status is required") ReportStatus status,
            @Size(max = 2000, message = "Note is too long") String note) {}

    public record ReportView(
            @JsonProperty("_id") String id,
            UserRef reporter,
            ReportTarget targetType,
            String targetId,
            String reason,
            ReportStatus status,
            String resolutionNote,
            Instant resolvedAt,
            Instant createdAt) {}

    // ---- saved searches
    public record SavedSearchRequest(
            @NotBlank(message = "Name is required") @Size(max = 80, message = "Name is too long") String name,
            @Size(max = 200) String q,
            @Size(max = 200) String location,
            @Size(max = 60) String category,
            List<String> skills,
            @PositiveOrZero Double minPrice,
            @PositiveOrZero Double maxPrice,
            @Min(-90) @Max(90) Double latitude,
            @Min(-180) @Max(180) Double longitude,
            @Positive Double radiusKm) {}

    public record SavedSearchView(
            @JsonProperty("_id") String id, String name, TaskSearch filters, Instant createdAt) {}

    // ---- admin
    public record SuspendRequest(@Size(max = 500, message = "Reason is too long") String reason) {}

    public record AdminStats(
            Map<String, Long> usersByRole,
            Map<String, Long> tasksByStatus,
            long totalRatings,
            long openDisputes,
            long openReports) {}

    public record AuditView(
            @JsonProperty("_id") String id,
            UserRef actor,
            String action,
            String targetType,
            String targetId,
            String details,
            Instant createdAt) {}
}
