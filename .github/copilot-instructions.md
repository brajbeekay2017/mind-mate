# Mind Mate: AI Agent Guidelines

## Project Overview
Mind Mate is a workplace wellness application combining mood tracking, AI-powered chat support, stress recovery challenges, and team alerts. It uses a **Node.js + Express backend** (port 4000) with **Vite + React frontend** (port 5173).

**Key Files:**
- Backend: `backend/src/server.js` (routes) + `backend/src/services/` (business logic)
- Frontend: `frontend/src/App.jsx` (main app) + `frontend/src/components/` (UI)
- Data: `backend/src/data/data.json` (user mood entries, indexed by userId)

---

## Architecture Essentials

### Data Model
- **Users**: Identified by `userId` string (passed as query param or body)
- **Mood Entries**: `{ mood: 0-4, stress: 0-5, feeling, context, timestamp, dayCompleted }`
- **Storage**: Single JSON file `data.json` with structure:
  ```json
  {
    "user-1": [{ mood, stress, timestamp, ... }],
    "user-2": [...],
    "dashboardData": { "user-1": { moodEntries, completedChallenges } }
  }
  ```

### Service Boundaries
1. **Mood Route** (`routes/mood.js`): Stores/retrieves mood entries. Calls `stressDetector.js` for alerts.
2. **Chat Route** (`routes/chat.js`): Direct LLM calls via `services/llm.js`
3. **Summary Route** (`routes/summary.js`): Analyzes last 12 mood entries using LLM
4. **Stress Recovery** (`routes/stressRecovery.js`): Generates personalized 3-day plans, broadcasts SSE events
5. **Smart Recommendations** (`routes/recommendations.js`): LLM-generated wellness suggestions
6. **Team Alerts** (`routes/teamAlerts.js`): Real-time SSE streaming for team events

### LLM System (Critical)
Located in `services/llm.js`. **Multi-provider with auto-fallback**:
- **Primary**: Groq (mixtral-8x7b-32768, very fast, free)
- **Fallback 1**: OpenAI (gpt-4o-mini)
- **Fallback 2**: Claude via HTTP (claude-haiku-4.5)
- **Fallback 3**: Deterministic responses (safe defaults in code)

**Key Functions:**
- `generateChatReply(message)` - Returns string reply with markdown formatting
- `generateSummary(entries)` - Analyzes mood array, returns plain text summary
- `generateRecoveryPlan(userId, moodData)` - Returns structured JSON with 3-day plan
- `getProviderInfo()` - Returns `{ activeProvider, model, fallbackChain }`

**Important**: All responses use markdown formatting (bullet points, bold, tables per `GROQ_SYSTEM_PROMPT`).

---
## Mind Mate — Copilot / AI Agent Quick Guide

Purpose: short, actionable instructions to get an AI coding agent productive in this repo.

- **Top-level architecture**: a Node/Express backend (`backend/`, port 4000) and a Vite + React frontend (`frontend/`, port 5173). Backend uses a single JSON store at `backend/src/data/data.json` (top-level keys = `userId`).

- **Key backend files**: `backend/src/server.js` (route wiring), `backend/src/services/llm.js` (LLM multi-provider + fallbacks), `backend/src/services/stressDetector.js` (alert rules), `backend/src/services/stressRecovery.js`, `backend/src/routes/mood.js`, `backend/src/routes/teamAlerts.js`, `backend/src/routes/stressRecovery.js`.

- **Key frontend files**: `frontend/src/App.jsx`, `frontend/src/components/ChatPanel.jsx`, `MoodInput.jsx`, `StressRecoveryChallenge.jsx`, `TeamAlertsPanel.jsx`, `HistoricCalendar.jsx` (calendar UI). Frontend stores lightweight state in `localStorage` keys `mindmate_user` and `mindmate_entries` and renders LLM markdown with `react-markdown`.

- **Data flow & conventions**:
  - All user-scoped APIs expect a `userId` (query param or body). Missing `userId` yields 401-like errors.
  - The JSON file is the single source of truth — read/write helpers in routes use `fs-extra`. Concurrent writes can corrupt `data.json`; do not change its top-level shape.
  - Routes return structured JSON; error responses are `{ error: 'message' }` (no raw exceptions to clients).

- **LLM behavior** (`backend/src/services/llm.js`): multi-provider with auto-fallback (Groq primary, OpenAI/Claude fallbacks, then deterministic defaults). Functions to call: `generateChatReply()`, `generateSummary()`, `generateRecoveryPlan()` and `getProviderInfo()`.

- **Real-time patterns**: SSE endpoints are used for streaming team alerts and recovery progress (`/team-alerts/stream`, `/stress-recovery/*`). Frontend uses `new EventSource(...)` to subscribe.

- **Stress detection rules**: encoded in `services/stressDetector.js`. Example rules to reference in tests: "2+ of last 3 entries stress >=4" and "mood variance >=2 across last 4 entries".

- **Developer workflows** (copy-paste):
```powershell
cd backend; npm install; npm run dev
cd frontend; npm install; npm run start
cd backend; npm test
```

- **Environment**: backend reads `.env` in `backend/` (keys: `GROQ_API_KEY`, `OPENAI_API_KEY`, `GROQ_MODEL`, `OPENAI_MODEL`, `LLM_PROVIDER`, `PORT`). If LLM keys are missing, code falls back to deterministic responses — tests assume this is possible.

- **Testing & smoke scripts**: unit tests live in `backend/test/` (Jest). Smoke scripts at repo root are PowerShell: `test-smoke.ps1`, `test-smoke-advanced.ps1`, `test-smoke-final.ps1` — these exercise LLM and SSE functionality.

- **Examples**:
  - POST mood (PowerShell):
```powershell
$body = @{ mood = 3; stress = 2 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/mood?userId=test" -Method POST -ContentType "application/json" -Body $body
```
  - Subscribe to team alerts (frontend): `new EventSource('/team-alerts/stream')`.

- **When adding routes/services**: place route files in `backend/src/routes/` and add to `server.js`. New service modules belong in `backend/src/services/` and should expose focused functions (no side effects); reuse `readData()`/`writeData()` patterns.

- **Important maintenance notes**:
  - Do not refactor `data.json` layout unless you update all read/write usage and tests.
  - SSE endpoints assume long-running connections — test with a browser EventSource or PowerShell SSE client when modifying.
  - LLM provider selection can be forced via `LLM_PROVIDER` env var for debugging.

If anything above is unclear or you'd like me to expand examples (e.g., exact read/write helpers or a short integration test for a new route), say which area and I'll update this file.
