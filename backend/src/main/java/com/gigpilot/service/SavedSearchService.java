package com.gigpilot.service;

import com.gigpilot.dto.Dtos.SavedSearchRequest;
import com.gigpilot.dto.Dtos.SavedSearchView;
import com.gigpilot.dto.Dtos.TaskSearch;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.SavedSearch;
import com.gigpilot.repository.SavedSearchRepository;
import com.gigpilot.util.Texts;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SavedSearchService {
    private static final int MAX_PER_USER = 20;

    private final SavedSearchRepository searches;
    private final TaskService taskService;

    public SavedSearchView create(String userId, SavedSearchRequest req) {
        if (searches.countByUser(userId) >= MAX_PER_USER) {
            throw ApiException.badRequest("You can save at most " + MAX_PER_USER + " searches");
        }
        if ((req.latitude() == null) != (req.longitude() == null)) {
            throw ApiException.badRequest("Both latitude and longitude are required");
        }
        SavedSearch s = new SavedSearch();
        s.setUser(userId);
        s.setName(req.name().trim());
        s.setQ(Texts.trimToNull(req.q()));
        s.setLocation(Texts.trimToNull(req.location()));
        s.setCategory(Texts.trimToNull(req.category()));
        s.setSkills(Texts.cleanList(req.skills(), 15, 40));
        s.setMinPrice(req.minPrice());
        s.setMaxPrice(req.maxPrice());
        s.setLatitude(req.latitude());
        s.setLongitude(req.longitude());
        s.setRadiusKm(req.radiusKm());
        return view(searches.save(s));
    }

    public List<SavedSearchView> list(String userId) {
        return searches.findByUser(userId, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(SavedSearchService::view)
                .toList();
    }

    public void delete(String userId, String id) {
        searches.delete(require(userId, id));
    }

    /** Runs a saved search against the current open tasks. */
    public Page<TaskView> run(String userId, String id, Pageable pageable) {
        return taskService.search(filters(require(userId, id)), pageable);
    }

    private SavedSearch require(String userId, String id) {
        Ids.require(id, "saved search");
        SavedSearch s = searches.findById(id).orElseThrow(() -> ApiException.notFound("Saved search not found"));
        if (!userId.equals(s.getUser())) {
            throw ApiException.forbidden("Access denied");
        }
        return s;
    }

    private static TaskSearch filters(SavedSearch s) {
        return new TaskSearch(s.getQ(), s.getLocation(), s.getCategory(), s.getSkills(), s.getMinPrice(),
                s.getMaxPrice(), s.getLatitude(), s.getLongitude(), s.getRadiusKm());
    }

    private static SavedSearchView view(SavedSearch s) {
        return new SavedSearchView(s.getId(), s.getName(), filters(s), s.getCreatedAt());
    }
}
