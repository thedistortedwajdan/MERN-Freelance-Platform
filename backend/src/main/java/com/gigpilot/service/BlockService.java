package com.gigpilot.service;

import com.gigpilot.dto.Dtos.UserRef;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.User;
import com.gigpilot.model.UserBlock;
import com.gigpilot.repository.UserBlockRepository;
import com.gigpilot.repository.UserRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BlockService {
    private final UserBlockRepository blocks;
    private final UserRepository users;
    private final ViewMapper mapper;

    /** True when either user has blocked the other. */
    public boolean isBlocked(String a, String b) {
        return a != null && b != null && blocks.existsBetween(a, b);
    }

    public void block(String blockerId, String targetId) {
        Ids.require(targetId, "user");
        if (blockerId.equals(targetId)) {
            throw ApiException.badRequest("You cannot block yourself");
        }
        if (!users.existsById(targetId)) {
            throw ApiException.notFound("User not found");
        }
        if (blocks.existsByBlockerAndBlocked(blockerId, targetId)) {
            return;
        }
        UserBlock block = new UserBlock();
        block.setBlocker(blockerId);
        block.setBlocked(targetId);
        try {
            blocks.save(block);
        } catch (DuplicateKeyException ignored) {
            // already blocked by a concurrent request
        }
    }

    public void unblock(String blockerId, String targetId) {
        Ids.require(targetId, "user");
        blocks.deleteByBlockerAndBlocked(blockerId, targetId);
    }

    public List<UserRef> list(String blockerId) {
        List<UserBlock> mine = blocks.findByBlocker(blockerId);
        Map<String, User> byId = mapper.loadUsers(mine.stream().map(UserBlock::getBlocked));
        return mine.stream()
                .map(b -> ViewMapper.ref(byId.get(b.getBlocked())))
                .filter(ref -> ref != null)
                .toList();
    }
}
