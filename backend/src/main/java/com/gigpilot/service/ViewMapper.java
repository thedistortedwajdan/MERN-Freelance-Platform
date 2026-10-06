package com.gigpilot.service;

import com.gigpilot.dto.Dtos.FileView;
import com.gigpilot.dto.Dtos.PortfolioItemDto;
import com.gigpilot.dto.Dtos.PublicUser;
import com.gigpilot.dto.Dtos.RatingView;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.dto.Dtos.UserRef;
import com.gigpilot.dto.Dtos.UserView;
import com.gigpilot.model.FileAsset;
import com.gigpilot.model.PortfolioItem;
import com.gigpilot.model.Rating;
import com.gigpilot.model.Task;
import com.gigpilot.model.User;
import com.gigpilot.repository.FileAssetRepository;
import com.gigpilot.repository.UserRepository;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Turns documents into API views, resolving referenced users and files in batches (Mongoose "populate"). */
@Component
@RequiredArgsConstructor
public class ViewMapper {
    private final UserRepository users;
    private final FileAssetRepository files;

    public Map<String, User> loadUsers(Stream<String> ids) {
        List<String> distinct = ids.filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return Map.of();
        }
        return users.findAllById(distinct).stream().collect(Collectors.toMap(User::getId, Function.identity()));
    }

    public static UserRef ref(User user) {
        return user == null ? null : new UserRef(user.getId(), user.getName());
    }

    private static List<PortfolioItemDto> portfolio(User user) {
        if (user.getPortfolio() == null) {
            return List.of();
        }
        return user.getPortfolio().stream()
                .map(p -> new PortfolioItemDto(p.getTitle(), p.getUrl(), p.getDescription()))
                .toList();
    }

    public static List<PortfolioItem> toPortfolio(List<PortfolioItemDto> dtos) {
        if (dtos == null) {
            return new java.util.ArrayList<>();
        }
        return dtos.stream()
                .limit(20)
                .map(d -> new PortfolioItem(d.title().trim(), d.url(), d.description()))
                .collect(Collectors.toCollection(java.util.ArrayList::new));
    }

    public static UserView userView(User user) {
        return new UserView(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getStatus(),
                user.isEmailVerified(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getSkills() == null ? List.of() : user.getSkills(),
                user.getHourlyRate(),
                user.getLocation(),
                portfolio(user),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }

    public static PublicUser publicUser(User user) {
        return new PublicUser(
                user.getId(),
                user.getName(),
                user.getRole(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getSkills() == null ? List.of() : user.getSkills(),
                user.getHourlyRate(),
                user.getLocation(),
                portfolio(user));
    }

    public List<TaskView> tasks(Collection<Task> tasks) {
        Map<String, User> byId = loadUsers(tasks.stream().flatMap(t -> Stream.of(t.getEmployer(), t.getFreelancer())));
        List<String> fileIds = tasks.stream()
                .flatMap(t -> Stream.concat(orEmpty(t.getAttachments()).stream(), orEmpty(t.getDeliverables()).stream()))
                .distinct()
                .toList();
        Map<String, FileAsset> fileById = fileIds.isEmpty()
                ? Map.of()
                : files.findAllById(fileIds).stream().collect(Collectors.toMap(FileAsset::getId, Function.identity()));

        return tasks.stream()
                .map(t -> new TaskView(
                        t.getId(),
                        t.getTitle(),
                        t.getDescription(),
                        t.getPrice(),
                        t.getAgreedPrice(),
                        t.getLocation(),
                        t.getCategory(),
                        orEmpty(t.getSkills()),
                        t.getDeadline(),
                        t.getGeo() == null ? null : t.getGeo().getY(),
                        t.getGeo() == null ? null : t.getGeo().getX(),
                        t.getStatus(),
                        ref(byId.get(t.getEmployer())),
                        ref(byId.get(t.getFreelancer())),
                        fileViews(t.getAttachments(), fileById),
                        fileViews(t.getDeliverables(), fileById),
                        t.getSubmissionNote(),
                        t.getRevisionNote(),
                        t.getCancelReason(),
                        t.isHidden(),
                        t.getSubmittedAt(),
                        t.getCompletedAt(),
                        t.getCreatedAt(),
                        t.getUpdatedAt()))
                .toList();
    }

    public TaskView task(Task task) {
        return tasks(List.of(task)).get(0);
    }

    public List<RatingView> ratings(Collection<Rating> ratings) {
        Map<String, User> byId = loadUsers(ratings.stream().map(Rating::getFrom));
        return ratings.stream()
                .map(r -> new RatingView(
                        r.getId(),
                        ref(byId.get(r.getFrom())),
                        r.getTo(),
                        r.getTask(),
                        r.getScore(),
                        r.getComment(),
                        r.getReply(),
                        r.getRepliedAt(),
                        r.getCreatedAt(),
                        r.getUpdatedAt()))
                .toList();
    }

    private static List<FileView> fileViews(List<String> ids, Map<String, FileAsset> byId) {
        return orEmpty(ids).stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(FileService::view)
                .toList();
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }
}
