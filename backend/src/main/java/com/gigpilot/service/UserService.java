package com.gigpilot.service;

import com.gigpilot.dto.Dtos.MeResponse;
import com.gigpilot.dto.Dtos.PortfolioItemDto;
import com.gigpilot.dto.Dtos.PublicProfileResponse;
import com.gigpilot.dto.Dtos.RecentRating;
import com.gigpilot.dto.Dtos.Stats;
import com.gigpilot.dto.Dtos.UpdateProfileRequest;
import com.gigpilot.dto.Dtos.UserView;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.Rating;
import com.gigpilot.model.Role;
import com.gigpilot.model.Task;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.model.User;
import com.gigpilot.repository.RatingRepository;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.repository.UserRepository;
import com.gigpilot.security.AuthUser;
import com.gigpilot.util.Texts;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class UserService {
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final UserRepository users;
    private final TaskRepository tasks;
    private final RatingRepository ratings;
    private final PasswordEncoder encoder;
    private final RefreshTokenService refreshTokens;
    private final ViewMapper mapper;

    public MeResponse me(AuthUser auth) {
        User user = users.findById(auth.id()).orElseThrow(() -> ApiException.notFound("User not found"));
        List<Task> myTasks = switch (auth.role()) {
            case freelancer -> tasks.findByFreelancer(auth.id());
            case employer -> tasks.findByEmployer(auth.id());
            case admin -> List.of();
        };
        List<Rating> received = ratings.findByRecipient(auth.id(), NEWEST_FIRST);

        int completed = (int) myTasks.stream().filter(t -> t.getStatus() == TaskStatus.completed).count();
        Stats stats = new Stats(myTasks.size(), completed, average(received), received.size());
        return new MeResponse(ViewMapper.userView(user), stats);
    }

    /** Fields left out (null) are unchanged; send an empty string or list to clear one. */
    @CacheEvict(cacheNames = "publicProfiles", allEntries = true)
    public UserView updateMe(AuthUser auth, UpdateProfileRequest req) {
        User user = users.findById(auth.id()).orElseThrow(() -> ApiException.notFound("User not found"));
        if (StringUtils.hasText(req.name())) {
            user.setName(req.name().trim());
        }
        if (req.bio() != null) {
            user.setBio(Texts.trimToNull(req.bio()));
        }
        if (req.avatarUrl() != null) {
            user.setAvatarUrl(requireHttpUrl(req.avatarUrl(), "Avatar url"));
        }
        if (req.skills() != null) {
            user.setSkills(Texts.cleanList(req.skills(), 30, 40));
        }
        if (req.hourlyRate() != null) {
            user.setHourlyRate(req.hourlyRate());
        }
        if (req.location() != null) {
            user.setLocation(Texts.trimToNull(req.location()));
        }
        if (req.portfolio() != null) {
            for (PortfolioItemDto item : req.portfolio()) {
                requireHttpUrl(item.url(), "Portfolio url");
            }
            user.setPortfolio(ViewMapper.toPortfolio(req.portfolio()));
        }
        boolean passwordChanged = StringUtils.hasText(req.password());
        if (passwordChanged) {
            user.setPassword(encoder.encode(req.password()));
        }
        UserView saved = ViewMapper.userView(users.save(user));
        if (passwordChanged) {
            refreshTokens.revokeAll(user.getId());
        }
        return saved;
    }

    @Cacheable(cacheNames = "publicProfiles", key = "#id")
    public PublicProfileResponse publicProfile(String id) {
        Ids.require(id, "user");
        User user = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));

        List<Rating> received = ratings.findByRecipient(id, NEWEST_FIRST);
        Map<String, User> authors = mapper.loadUsers(received.stream().limit(5).map(Rating::getFrom));
        List<RecentRating> recent = received.stream()
                .limit(5)
                .map(r -> new RecentRating(
                        r.getScore(),
                        r.getComment(),
                        authors.containsKey(r.getFrom()) ? authors.get(r.getFrom()).getName() : null))
                .toList();

        List<Task> completedTasks = user.getRole() == Role.freelancer
                ? tasks.findByFreelancerAndStatus(id, TaskStatus.completed, NEWEST_FIRST)
                : tasks.findByEmployerAndStatus(id, TaskStatus.completed, NEWEST_FIRST);

        return new PublicProfileResponse(
                ViewMapper.publicUser(user),
                average(received),
                received.size(),
                recent,
                mapper.tasks(completedTasks.stream().filter(t -> !t.isHidden()).limit(5).toList()));
    }

    private static String requireHttpUrl(String url, String label) {
        String trimmed = Texts.trimToNull(url);
        if (trimmed != null && !trimmed.matches("(?i)^https?://\\S+$")) {
            throw ApiException.badRequest(label + " must start with http:// or https://");
        }
        return trimmed;
    }

    /** One decimal place as a string (or null when unrated), the format the frontend already expects. */
    static String average(List<Rating> list) {
        if (list.isEmpty()) {
            return null;
        }
        double avg = list.stream().mapToInt(Rating::getScore).average().orElse(0);
        return String.format(Locale.ROOT, "%.1f", avg);
    }
}
