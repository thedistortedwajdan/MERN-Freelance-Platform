# GigPilot Backend (Spring Boot)

Spring Boot API for the GigPilot freelance marketplace (it replaced the original Express backend).

- Java 17, Spring Boot 3.3, Maven
- Spring Web, Spring Data MongoDB, Bean Validation, Spring Security (stateless), Caffeine cache, Actuator
- JWT access tokens + rotating refresh tokens, BCrypt
- OpenAPI docs at **`/swagger-ui.html`** (raw spec at `/v3/api-docs`)

## Run

```bash
cp .env.example .env   # then edit
mvn spring-boot:run
```

Or with Docker (backend + MongoDB), from the repo root:

```bash
JWT_SECRET=<at least 32 characters> docker compose up --build
```

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | Mongo connection string (default `mongodb://localhost:27017/gigpilot`) |
| `JWT_SECRET` | HS256 secret, **at least 32 characters** (startup fails otherwise) |
| `PORT` | Server port (default `5000`) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins (default `http://localhost:5173`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional. Creates the first admin on startup (admins cannot self-register) |
| `STORAGE_DIR` | Where uploaded files are stored (default `./uploads`) |
| `LOG_AUTH_TOKENS` | **Dev only.** Prints password-reset / email-verification tokens to the log (there is no mailer yet) |

`.env` is read automatically from the working directory.

## Conventions

- Errors are always `{ "error": "message" }` (400/401/403/404/409/413/429 as appropriate).
- Documents are returned with `_id`.
- Lists are **plain JSON arrays**. Paging is `?page=0&size=50` (max 100) and totals come back in the
  `X-Total-Count` and `X-Total-Pages` headers.
- Send `Authorization: Bearer <accessToken>`. Access tokens last 30 minutes; use the refresh token to get a new pair.

## Auth & accounts

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | `freelancer` or `employer` |
| POST | `/api/auth/login` | `{ token, refreshToken, user }` |
| POST | `/api/auth/refresh` | rotates the refresh token; re-using an old one revokes all sessions |
| POST | `/api/auth/logout` · `/logout-all` | revoke one / every session |
| POST | `/api/auth/forgot-password` · `/reset-password` | one-hour token; resetting revokes all sessions |
| POST | `/api/auth/verify-email` · `/resend-verification` | email verification (not enforced) |

Login, register, forgot- and reset-password are rate limited per IP (10 per minute by default).

## Tasks

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/tasks` | employer. `title, description, price, location, category, skills[], deadline, latitude, longitude, attachmentIds[]` |
| GET | `/api/tasks` | open tasks. Filters `q, location, category, skills, minPrice, maxPrice`, geo `lat, lng, radiusKm`, `sort=newest\|oldest\|price_asc\|price_desc\|deadline`, paging |
| GET | `/api/tasks/posted` · `/assigned` | employer's / freelancer's own tasks, `?status=` |
| GET / PUT / DELETE | `/api/tasks/{id}` | edit and delete only while `open` |
| POST | `/api/tasks/{id}/accept` | freelancer, instant accept at the posted budget (atomic) |
| POST | `/api/tasks/{id}/withdraw` | assigned freelancer drops out, task reopens |
| POST | `/api/tasks/{id}/submit` | freelancer hands in work `{ note, attachmentIds }` → `submitted` |
| POST | `/api/tasks/{id}/approve` · `/revision` | employer approves → `completed`, or sends back with `{ note }` |
| POST | `/api/tasks/{id}/cancel` | employer, `{ reason }` |
| POST | `/api/tasks/{id}/complete` | legacy one-step completion by the freelancer (no review) |
| POST / DELETE | `/api/tasks/{id}/favorite` · GET `/api/tasks/favorites` | saved tasks |
| GET / POST / DELETE | `/api/saved-searches`, GET `/api/saved-searches/{id}/results` | up to 20 per user |

Statuses: `open → assigned → submitted → completed`, plus `cancelled` and `expired`
(open tasks past their `deadline` are expired by an hourly job).

## Proposals (bidding)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/tasks/{id}/proposals` | freelancer: `{ price, message, etaDays }`, one per task |
| GET | `/api/tasks/{id}/proposals` | the task's employer |
| GET | `/api/proposals/mine` | freelancer |
| POST | `/api/proposals/{id}/accept` | assigns the task at the proposed price, declines the others |
| POST | `/api/proposals/{id}/reject` · `/withdraw` | employer / freelancer |

## Messaging (REST + polling)

Chat is scoped to a task, between its employer and assigned freelancer.

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/tasks/{id}/messages` | `{ text }` |
| GET | `/api/tasks/{id}/messages?after=<lastMessageId>` | oldest first; only messages newer than `after`. Without `after`: the latest 50 |
| POST | `/api/tasks/{id}/messages/read` | mark incoming messages read |
| GET | `/api/messages/unread-count` · `/api/conversations` | inbox |

Recommended client loop: poll `GET /messages?after=<lastId>` **every 500 ms** while a conversation is open,
and `GET /api/notifications/unread-count` for the badge. An empty poll is a single indexed query and responses
are `Cache-Control: no-store`.

## Notifications (in-app only, no email)

`GET /api/notifications?unread=true&after=<id>` · `GET /api/notifications/unread-count` ·
`POST /api/notifications/{id}/read` · `POST /api/notifications/read-all`.
Events: proposals received/accepted/declined, task accepted/submitted/approved/cancelled/withdrawn/expired,
revision requested, ratings and replies, disputes and report outcomes.

## Ratings, profiles, trust & safety

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/ratings` | participants, only after the task is `completed`, no self-rating |
| PUT | `/api/ratings/{id}` · POST `/api/ratings/{id}/reply` | author edits / rated user replies once |
| GET | `/api/ratings/{userId}` | |
| GET / PUT | `/api/users/me` | profile and stats; PUT accepts `name, password, bio, avatarUrl, skills[], hourlyRate, location, portfolio[]` |
| GET | `/api/users/{id}` | public profile (cached 30 s) |
| POST / DELETE | `/api/users/{id}/block` · GET `/api/users/me/blocks` | blocked pairs cannot message, bid or accept |
| POST | `/api/reports` | flag a `user`, `task` or `rating` |
| POST | `/api/tasks/{id}/disputes` · GET `/api/disputes` | open a dispute on an active/completed task |

## Files

`POST /api/files` (multipart field `file`, max 10 MB; png/jpg/gif/webp/pdf/txt/zip/doc/docx/xlsx) returns
`{ _id, name, contentType, size }`. Pass the ids as `attachmentIds` when creating a task or submitting work.
`GET /api/files/{id}` downloads: task attachments are visible to signed-in users, deliverables only to the
two participants and admins. Files are stored on local disk (`STORAGE_DIR`) under random names.

## Admin (`/api/admin/**`, role `admin`)

`GET /stats` · `GET /users?q&role&status` · `POST /users/{id}/suspend|unsuspend` ·
`GET /tasks?q&status&hidden` · `POST /tasks/{id}/hide|unhide` · `DELETE /ratings/{id}` ·
`GET /disputes` · `POST /disputes/{id}/resolve` (`resolution`, optional `outcome: complete_task|cancel_task`) ·
`GET /reports` · `POST /reports/{id}/resolve` · `GET /audit`.
Suspension revokes refresh tokens; an already-issued access token keeps working until it expires (≤ 30 min).

## Layout

```
src/main/java/com/gigpilot/
├── config/       SecurityConfig, AppConfig (cache, scheduling, OpenAPI)
├── security/     JwtService, JwtAuthFilter, RateLimiter / RateLimitFilter, AuthUser
├── model/        Mongo documents and enums
├── repository/   Spring Data repositories
├── dto/          Request/response records
├── service/      Business rules
├── controller/   REST controllers
├── exception/    ApiException + global {"error": "..."} handler
└── util/         Pages, Texts, Tokens
```

## Tests

```bash
mvn test                # unit tests (no database needed)
mvn verify -Pit         # + integration tests against MongoDB in Docker (Testcontainers)
```

## Known limits

- No payments/escrow and no email delivery yet. Password-reset and verification tokens go through the
  `TokenDelivery` interface; the default implementation only logs them (see `LOG_AUTH_TOKENS`).
- Rate limiting and the profile cache are per instance (in memory).
- Uploaded files live on local disk; use a shared volume or swap `FileService` for object storage when scaling out.
- Task search uses case-insensitive substring matching over title, description, category and skills, not a Mongo text index.
