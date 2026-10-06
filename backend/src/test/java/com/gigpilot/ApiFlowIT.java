package com.gigpilot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * End-to-end walk through the marketplace against a real MongoDB.
 * Needs Docker; run with {@code mvn verify -Pit}.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class ApiFlowIT {
    @Container
    static final MongoDBContainer MONGO = new MongoDBContainer("mongo:7");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) throws Exception {
        registry.add("spring.data.mongodb.uri", () -> MONGO.getReplicaSetUrl("gigpilot_it"));
        registry.add("app.jwt.secret", () -> "integration-test-secret-integration-test-secret");
        registry.add("app.rate-limit.auth-max", () -> "10000");
        String storage = Files.createTempDirectory("gigpilot-it").toString();
        registry.add("app.storage.dir", () -> storage);
        registry.add("app.auth.log-tokens", () -> "false");
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    // ------------------------------------------------------------------ helpers

    private JsonNode call(MockHttpServletRequestBuilder request, String token, Object body, int expected) throws Exception {
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (body != null) request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        MvcResult result = mvc.perform(request).andExpect(status().is(expected)).andReturn();
        String content = result.getResponse().getContentAsString();
        return content.isBlank() ? json.createObjectNode() : json.readTree(content);
    }

    private record Account(String id, String token, String refresh) {}

    private Account signUp(String role) throws Exception {
        String email = role + "-" + UUID.randomUUID() + "@example.com";
        call(post("/api/auth/register"), null,
                java.util.Map.of("name", role, "email", email, "password", "secret1", "role", role), 201);
        JsonNode login = call(post("/api/auth/login"), null,
                java.util.Map.of("email", email, "password", "secret1"), 200);
        return new Account(login.at("/user/_id").asText(), login.get("token").asText(), login.get("refreshToken").asText());
    }

    // ------------------------------------------------------------------ tests

    @Test
    void bidAcceptChatDeliverReviewAndRate() throws Exception {
        Account employer = signUp("employer");
        Account freelancer = signUp("freelancer");

        // post a geo-tagged task with skills
        JsonNode task = call(post("/api/tasks"), employer.token(), java.util.Map.of(
                "title", "Paint a fence", "description", "White, two coats", "price", 100,
                "category", "Painting", "skills", java.util.List.of("paint", "ladder"),
                "latitude", 24.86, "longitude", 67.01), 201);
        String taskId = task.get("_id").asText();

        // discovery: filters, geo search and paging headers
        JsonNode found = call(get("/api/tasks?category=painting&skills=PAINT&lat=24.87&lng=67.0&radiusKm=10&sort=price_desc"),
                freelancer.token(), null, 200);
        assertTrue(found.findValuesAsText("_id").contains(taskId));
        JsonNode far = call(get("/api/tasks?lat=51.5&lng=-0.12&radiusKm=10"), freelancer.token(), null, 200);
        assertFalse(far.findValuesAsText("_id").contains(taskId));

        // save it, then bid
        call(post("/api/tasks/" + taskId + "/favorite"), freelancer.token(), null, 200);
        assertEquals(1, call(get("/api/tasks/favorites"), freelancer.token(), null, 200).size());
        JsonNode proposal = call(post("/api/tasks/" + taskId + "/proposals"), freelancer.token(),
                java.util.Map.of("price", 80, "message", "I can do it tomorrow", "etaDays", 2), 201);
        call(post("/api/tasks/" + taskId + "/proposals"), freelancer.token(),
                java.util.Map.of("price", 70, "message", "again"), 400);
        assertEquals(1, call(get("/api/notifications/unread-count"), employer.token(), null, 200).get("unread").asInt());

        // employer accepts the proposal: the agreed price is the bid
        JsonNode assigned = call(post("/api/proposals/" + proposal.get("_id").asText() + "/accept"),
                employer.token(), null, 200);
        assertEquals("assigned", assigned.get("status").asText());
        assertEquals(80.0, assigned.get("agreedPrice").asDouble());

        // chat by polling
        JsonNode first = call(post("/api/tasks/" + taskId + "/messages"), employer.token(),
                java.util.Map.of("text", "Please use matte paint"), 201);
        JsonNode poll = call(get("/api/tasks/" + taskId + "/messages"), freelancer.token(), null, 200);
        assertEquals(1, poll.size());
        assertEquals(0, call(get("/api/tasks/" + taskId + "/messages?after=" + first.get("_id").asText()),
                freelancer.token(), null, 200).size());
        assertEquals(1, call(get("/api/messages/unread-count"), freelancer.token(), null, 200).get("unread").asInt());
        call(post("/api/tasks/" + taskId + "/messages/read"), freelancer.token(), null, 200);
        assertEquals(0, call(get("/api/messages/unread-count"), freelancer.token(), null, 200).get("unread").asInt());

        // deliver, ask for changes, deliver again, approve
        call(post("/api/tasks/" + taskId + "/submit"), freelancer.token(), java.util.Map.of("note", "done"), 200);
        call(post("/api/tasks/" + taskId + "/revision"), employer.token(), java.util.Map.of("note", "second coat"), 200);
        call(post("/api/tasks/" + taskId + "/submit"), freelancer.token(), java.util.Map.of("note", "fixed"), 200);
        assertEquals("completed", call(post("/api/tasks/" + taskId + "/approve"), employer.token(), null, 200)
                .get("status").asText());

        // rate, reply, edit
        JsonNode rating = call(post("/api/ratings"), employer.token(), java.util.Map.of(
                "to", freelancer.id(), "task", taskId, "score", 5, "comment", "great"), 201);
        call(post("/api/ratings/" + rating.get("_id").asText() + "/reply"), freelancer.token(),
                java.util.Map.of("reply", "thanks!"), 200);
        call(post("/api/ratings/" + rating.get("_id").asText() + "/reply"), freelancer.token(),
                java.util.Map.of("reply", "again"), 400);
        JsonNode profile = call(get("/api/users/" + freelancer.id()), null, null, 200);
        assertEquals("5.0", profile.get("avgRating").asText());
    }

    @Test
    void refreshTokensRotateAndReuseIsDetected() throws Exception {
        Account user = signUp("freelancer");

        JsonNode rotated = call(post("/api/auth/refresh"), null, java.util.Map.of("refreshToken", user.refresh()), 200);
        String newRefresh = rotated.get("refreshToken").asText();

        // the old token was rotated out: presenting it again revokes the whole family
        call(post("/api/auth/refresh"), null, java.util.Map.of("refreshToken", user.refresh()), 401);
        call(post("/api/auth/refresh"), null, java.util.Map.of("refreshToken", newRefresh), 401);
    }

    @Test
    void rolesAreEnforced() throws Exception {
        Account freelancer = signUp("freelancer");
        call(get("/api/tasks"), null, null, 401);
        call(get("/api/admin/stats"), freelancer.token(), null, 403);
        call(post("/api/tasks"), freelancer.token(),
                java.util.Map.of("title", "x", "description", "y", "price", 1), 403);
    }

    @Test
    void blockedUsersCannotMessageEachOther() throws Exception {
        Account employer = signUp("employer");
        Account freelancer = signUp("freelancer");
        JsonNode task = call(post("/api/tasks"), employer.token(),
                java.util.Map.of("title", "Chat task", "description", "d", "price", 10), 201);
        String taskId = task.get("_id").asText();
        call(post("/api/tasks/" + taskId + "/accept"), freelancer.token(), null, 200);

        call(post("/api/users/" + freelancer.id() + "/block"), employer.token(), null, 200);
        call(post("/api/tasks/" + taskId + "/messages"), employer.token(), java.util.Map.of("text", "hi"), 403);
        call(post("/api/tasks/" + taskId + "/messages"), freelancer.token(), java.util.Map.of("text", "hi"), 403);
        call(delete("/api/users/" + freelancer.id() + "/block"), employer.token(), null, 200);
        call(post("/api/tasks/" + taskId + "/messages"), employer.token(), java.util.Map.of("text", "hi"), 201);
    }

    @Test
    void uploadedDeliverablesAreOnlyVisibleToParticipants() throws Exception {
        Account employer = signUp("employer");
        Account freelancer = signUp("freelancer");
        Account stranger = signUp("freelancer");
        JsonNode task = call(post("/api/tasks"), employer.token(),
                java.util.Map.of("title", "Logo", "description", "d", "price", 10), 201);
        String taskId = task.get("_id").asText();
        call(post("/api/tasks/" + taskId + "/accept"), freelancer.token(), null, 200);

        var upload = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/files")
                .file(new org.springframework.mock.web.MockMultipartFile("file", "logo.txt", "text/plain", "hello".getBytes()))
                .header("Authorization", "Bearer " + freelancer.token());
        String fileId = json.readTree(mvc.perform(upload).andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()).get("_id").asText();

        call(post("/api/tasks/" + taskId + "/submit"), freelancer.token(),
                java.util.Map.of("note", "here", "attachmentIds", java.util.List.of(fileId)), 200);

        mvc.perform(get("/api/files/" + fileId).header("Authorization", "Bearer " + employer.token()))
                .andExpect(status().isOk());
        mvc.perform(get("/api/files/" + fileId).header("Authorization", "Bearer " + stranger.token()))
                .andExpect(status().isForbidden());
    }

    @Test
    void passwordResetRevokesSessions() throws Exception {
        Account user = signUp("employer");
        call(post("/api/auth/forgot-password"), null, java.util.Map.of("email", "nobody@example.com"), 200);
        call(post("/api/auth/reset-password"), null, java.util.Map.of("token", "bogus", "password", "newsecret"), 400);
        call(post("/api/auth/logout-all"), user.token(), null, 200);
        call(post("/api/auth/refresh"), null, java.util.Map.of("refreshToken", user.refresh()), 401);
    }
}
