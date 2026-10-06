# GigPilot Frontend

React 19 single-page app (Vite, Tailwind 4, React Router 7). Design language: **Sunrise**, a warm dawn palette in light mode and a calm pre-dawn sky in dark mode. Responsive from phones (bottom tab bar, bottom-sheet dialogs) to wide desktops.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Structure

```
src/
├── data/          Data layer (see below)
├── context/       Auth, theme (light / dark / system), toasts, live counters (polling)
├── lib/           format helpers, hooks (useAsync, usePolling…), constants, notification metadata
├── components/
│   ├── ui/        Design system: Icon, Button, Card, Chip, forms, modals, tabs, pagination, stepper
│   ├── layout/    App shell: top nav, mobile tab bar, notification bell
│   ├── common/    Brand (logo, sunrise hero), route guards, report dialog, notification item
│   ├── task/      Task card, status badge, lifecycle stepper, proposal and delivery panels
│   ├── rating/    Review item (edit / reply / remove) and the two-sided review panel
│   └── profile/   Growth card, profile header, skills, portfolio
└── pages/         One file per screen; `auth/` and `admin/` hold their groups
```

## Screens

| Area | Routes |
| --- | --- |
| Public | `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/users/:id` |
| Everyone signed in | `/tasks/:id`, `/notifications`, `/settings`, `/profile`, `/messages`, `/messages/:taskId`, `/disputes`, `/find` |
| Freelancers | `/proposals`, `/saved`, `/my-tasks` (their work) |
| Employers | `/tasks/new`, `/tasks/:id/edit`, `/my-tasks` (their tasks) |
| Admins | `/admin`, `/admin/users`, `/admin/tasks`, `/admin/disputes`, `/admin/reports`, `/admin/audit` |

Old routes (`/dashboard`, `/post-task`, `/task/:id`, `/user/:id`) redirect to the new ones.

## Data layer

Every screen talks to a single facade, `src/data/client.js`, whose methods mirror the backend endpoints one for one: same inputs, same `_id`-based response shapes, same business rules and error messages. Lists resolve to `{ data, total, pages }` (the backend returns the array with `X-Total-Count` / `X-Total-Pages` headers).

Right now the facade is backed by an in-memory database (`db.js`, seeded by `seed.js`, persisted to `localStorage`) so every component can be built and tested on its own. To connect the Spring Boot API, re-implement the methods of `client.js` on top of an HTTP client (`src/services/api.js` already holds an axios instance with refresh-token handling); no component needs to change.

Sample accounts in the seed data (password `password123` for all):

| Role | Email |
| --- | --- |
| Freelancer | `ayesha@example.com`, `hamza@example.com`, `noor@example.com` |
| Employer | `bilal@example.com`, `sara@example.com`, `omar@example.com` |
| Admin | `admin@example.com` |

The **Quick access** button in the bottom-left corner (`src/components/common/QuickAccess.jsx`) gives anyone everything needed to try the whole app:

- one-click sign-in as any sample person, with a note on what each one has waiting
- the password-reset and email-confirmation codes that would normally arrive by email, with Copy and "Use it"
- **Start over**, which signs out and restores the original data

Remove `<QuickAccess />` from `components/layout/AppShell.jsx` (and `api.dev` from `data/client.js`) when the real backend is connected.

## Behaviour notes

- Chat polls for new messages every 500 ms; notification and unread-message counters poll every 2.5 s.
- Polling pauses while the tab is hidden and silently retries after a failed request.
- Theme preference (light / dark / automatic) is stored locally and applied before first paint, so there is no flash.
