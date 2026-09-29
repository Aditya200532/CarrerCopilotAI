# CareerPilot AI — Intelligent Placement & Interview Preparation Platform

A full-stack **MERN + GenAI** platform for college students (3rd/4th-year IT/CS) preparing for internships and placements. CareerPilot analyzes your resume and target jobs, produces a **transparent skill-gap analysis**, generates a **personalized preparation roadmap**, tracks **DSA progress** to find weak areas, and runs **live AI mock interviews** over WebSockets with a full debrief report.

> Not a LeetCode clone. Not a generic chatbot. A placement-preparation copilot where every architectural component exists for a real reason.

---

## Architecture

```
┌────────────────┐     REST (JWT)      ┌─────────────────────────────┐
│  React (Vite)  │ ──────────────────► │   Node.js + Express API     │
│  SPA frontend  │     WebSockets      │  routes → controllers →     │
│                │ ◄══════════════════► │  services → models          │
└────────────────┘   /interview nsp    └──────┬───────┬───────┬──────┘
                                              │       │       │
                                          ┌───▼──┐ ┌──▼───┐ ┌─▼──────────┐
                                          │Mongo │ │Redis │ │ BullMQ     │
                                          │(data)│ │(cache│ │ queues     │
                                          └──────┘ │+queue│ └─┬──────────┘
                                                   └──────┘   │ consumed by
                                                        ┌─────▼──────────┐
                                                        │  AI Worker     │
                                                        │ (own process)  │
                                                        └─────┬──────────┘
                                                              │
                                                        ┌─────▼─────┐
                                                        │  LLM API  │
                                                        │(OpenAI-   │
                                                        │ compatible│
                                                        └───────────┘
```

**Flow:** React frontend → Express API → application services → MongoDB / Redis / queues → AI worker → LLM API.

### Why each component exists (viva talking points)

| Component | Real reason |
|---|---|
| **Redis cache** | Answers *"do we already have this result?"* — generic topic explanations, interview question banks and JD skill extraction are cached with TTLs (`ai:` key prefix + content hash). One student asking "explain binary search" triggers one LLM call; the next 499 get cache hits. **Personalized results (resume analysis, gaps, roadmaps) are deliberately NOT in the shared cache** — they live per-user in MongoDB. |
| **BullMQ queues + worker** | Answers *"which task should run asynchronously?"* — resume analysis, skill-gap, roadmap and report generation take 5–30s; the API returns `202 Accepted` with an `analysisId` immediately and a separate worker process does the LLM work with **3 retries + exponential backoff** and capped concurrency (a second layer of LLM cost control). |
| **WebSockets (socket.io)** | A mock interview is a server-driven turn-based conversation (question → answer → follow-up → round transitions) plus instant notification push. HTTP polling can't do server-initiated flow. |
| **Event bus + notification queue** | Domain services emit facts (`analysis.completed`, `task.completed`…) and never call notification code directly. Listeners enqueue notification jobs; delivery uses a **Strategy pattern** (`InAppNotificationChannel` implemented; Email/Push stubs behind the same interface — Open/Closed Principle). |
| **Rate limiting** | Two tiers: a global API limiter and a stricter per-user **AI limiter** on every endpoint that triggers LLM work, because LLM APIs have hard cost/usage limits. |
| **Indexes + pagination** | MongoDB text index on jobs (title/company/description), compound indexes for hot queries (`user+read+createdAt` for notifications, `user+status+order` for tasks, unique `user+title+platform` for DSA logs). Every list endpoint is server-side paginated — never loads whole collections. |

### LLD / design patterns (used where they earn their place)

- **Strategy** — `InterviewStrategy` with `ResumeInterview`, `JavaOopInterview`, `DsaInterview`, `SqlInterview`, `BackendInterview`, `LldInterview`, `SystemDesignInterview` (`backend/src/interviews/strategies.js`). Adding a round type = one class + one registry entry.
- **Strategy** — `NotificationChannel` with In-App / Email / Push implementations (`backend/src/notifications/channels.js`).
- **Cache-aside** — `cacheService.wrap(key, ttl, computeFn)` (`backend/src/services/cacheService.js`).
- **Layered separation** — routes (HTTP concerns) → controllers (thin) → services (business logic) → models (data). Prompts isolated in `backend/src/ai/prompts.js`; the LLM SDK is only touched in `backend/src/ai/llmClient.js`.
- **Transparent matching** — skill-gap comparison is deterministic set arithmetic (`compareSkillSets`), not a mystery AI score. The LLM only *prioritizes* the gaps on top.

### Graceful degradation without an LLM key

Every AI feature has a deterministic local fallback (`backend/src/ai/localFallback.js`): catalog-based skill extraction from resume/JD text, heuristic roadmaps, a curated interview question bank and follow-ups. The whole product is demonstrable offline; add `OPENAI_API_KEY` to switch to live LLM mode (any OpenAI-compatible endpoint: OpenAI, Groq, Together, Ollama…).

---

## Tech stack

**Frontend:** React 18, Vite, Tailwind CSS, react-router, axios, socket.io-client, lucide-react
**Backend:** Node.js, Express 4, Mongoose 8, JWT auth, Zod validation, BullMQ, ioredis, socket.io, multer, pdf-parse, express-rate-limit, helmet
**Data:** MongoDB (persistent store, indexed), Redis (cache + queues)
**AI:** OpenAI-compatible LLM API (model configurable via `LLM_MODEL`)

---

## Running the project

### 1. Prerequisites
Node.js 18+, and MongoDB + Redis. Easiest via Docker:

```bash
docker compose up -d        # starts MongoDB :27017 and Redis :6379
```

(Or point `MONGO_URI`/`REDIS_URL` in `backend/.env` at any existing instances, e.g. MongoDB Atlas.)

### 2. Backend

```bash
cd backend
cp .env.example .env        # edit: JWT_SECRET, optionally OPENAI_API_KEY / OPENAI_BASE_URL / LLM_MODEL
npm install
npm run seed                # skill catalog + demo student + 3 sample jobs
```

Run the two processes (terminal 1 and 2):

```bash
npm run dev                 # API + WebSockets on http://localhost:5000
npm run worker              # AI worker (queues) — required for resume analysis, roadmaps, reports
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api and /socket.io to :5000)
```

**Demo login (after seeding):** `demo@careerpilot.dev` / `demo1234`

---

## Feature tour (demo script)

1. **Register/Login** → JWT issued, profile auto-created.
2. **Profile** → education, CGPA, languages/frameworks/databases with proficiency, projects, target roles.
3. **Resume Analyzer** → upload PDF → HTTP 202 + queued badge → *switch to the worker terminal to show it processing* → notification arrives live in the topbar bell → structured result (skills, strengths, weaknesses, readiness score).
4. **Job Explorer** → paste a real JD → worker extracts required skills (watch the second identical JD hit the cache) → search/paginate.
5. **Job Details → Match** → transparent "you have / you need" comparison with coverage %.
6. **Skill Gap** → queued analysis → deterministic comparison + AI prioritization ("learn X first because…").
7. **Roadmap** → generate → worker creates a plan + ordered tasks (DSA weak areas included) → check off tasks, progress bar updates.
8. **DSA Progress** → log problems → per-topic scores → weak-area recommendations.
9. **Mock Interview** → pick role + rounds → live WebSocket interview with follow-ups → End & get report → report generates async → full debrief + transcript.
10. **Settings** → shows live-LLM vs local-fallback mode; **Notifications** page shows the event-driven history.

---

## Project structure

```
backend/
├── src/
│   ├── config/          # env, db, redis (cache+queue connection)
│   ├── models/          # 12 Mongoose schemas with indexes
│   ├── middleware/      # JWT auth, RBAC, zod validate, rate limits, error handler
│   ├── controllers/     # thin HTTP layer
│   ├── services/        # business logic (auth, profile, job, resume, analysis,
│   │                    #   plan, dsa, interview, dashboard, cache, notifications)
│   ├── ai/              # llmClient (only SDK usage), prompts, aiService facade,
│   │                    #   localFallback (no-key mode)
│   ├── queue/           # BullMQ queue definitions
│   ├── events/          # in-process event bus
│   ├── notifications/   # channel strategies + event listeners
│   ├── interviews/      # InterviewStrategy implementations
│   ├── realtime/        # socket.io gateway + interview engine
│   ├── routes/          # REST route tables
│   └── validations/     # zod schemas
├── worker/              # AI worker process (queue consumers, retries)
└── scripts/             # seed, import-check
frontend/
└── src/
    ├── api/             # axios instance + typed endpoint map
    ├── context/         # AuthContext
    ├── hooks/           # useFetch, useAnalysisPolling (queue status polling)
    ├── components/      # layout (sidebar/topbar/bell) + UI primitives
    └── pages/           # Landing, Auth, Dashboard, Profile, ResumeAnalyzer,
                         #   JobExplorer, JobDetails, SkillGap, Roadmap,
                         #   DsaProgress, MockInterview, InterviewRoom (WS),
                         #   InterviewReport, Notifications, Settings
```

## Key API surface

| Method & path | Purpose |
|---|---|
| `POST /api/auth/register` · `login` · `GET /api/auth/me` | JWT auth |
| `GET/PUT /api/profile` | Student profile |
| `GET/POST /api/jobs` (+ `?search=&type=&page=`) · `GET /api/jobs/:id/match` | Job store, text search, pagination, transparent match |
| `POST /api/resumes` | Upload → **202 + queued analysis** |
| `GET /api/analysis/:id` | Poll queue result; `POST /api/analysis/skill-gap` · `/roadmap` enqueue AI jobs (AI rate-limited) |
| `GET /api/plan` · `PATCH /api/plan/tasks/:id` | Roadmap + task tracking |
| `GET /api/dsa/stats` · `CRUD /api/dsa/problems` | DSA progress + weak areas |
| `CRUD /api/interviews` | Sessions + reports; live rounds over `/interview` WebSocket namespace |
| `GET /api/notifications` | Event-driven notification inbox |
| `POST /api/ai/explain` | **Redis cache showcase** (response includes `cached: true/false`) |

## Environment variables

See `backend/.env.example` — server port, Mongo/Redis URLs, JWT settings, LLM key/base-URL/model, rate-limit and cache-TTL knobs.
