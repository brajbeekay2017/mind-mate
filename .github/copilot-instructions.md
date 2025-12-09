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

## Frontend Patterns

### React Component Structure
- Use React hooks (useState, useEffect, useRef)
- Fetch API to `http://localhost:4000/*` endpoints
- Store user data in localStorage under key `mindmate_user` and `mindmate_entries`
- Components handle markdown rendering via `react-markdown` library

### Key Components & Responsibilities
- **ChatPanel.jsx**: Chat interface, sends POST `/chat`, streams responses as markdown
- **MoodInput.jsx**: Emoji mood selector (0-4), stress slider, saves to `/mood`
- **TrendChart.jsx**: Charts last 10 mood entries using chart.js
- **StressRecoveryChallenge.jsx**: Generates challenge via `/stress-recovery/generate`, subscribes to SSE for real-time updates
- **SmartRecommendations.jsx**: Displays LLM recommendations with priority ranking
- **TeamAlertsPanel.jsx**: Real-time team event feed via SSE `/team-alerts/stream`

### UI Conventions
- Tab-based navigation: Dashboard | Recovery | Recommendations | Alerts
- Emoji-driven mood input (no numeric scales visible)
- Markdown content rendered with react-markdown
- Success alerts with modal/toast pattern

---

## Developer Workflows

### Local Development Setup
```bash
# Backend
cd backend
npm install
npm run dev        # Runs with nodemon on port 4000

# Frontend (separate terminal)
cd frontend
npm install
npm run start      # Vite dev server on port 5173
```

### Environment Configuration
Backend uses `.env` file in `backend/` folder (loaded by dotenv):
```
GROQ_API_KEY=xxx          # Required for Groq
OPENAI_API_KEY=xxx        # Optional, for fallback
GROQ_MODEL=mixtral-8x7b-32768
OPENAI_MODEL=gpt-4o-mini
LLM_PROVIDER=auto         # 'auto', 'groq', 'openai', 'claude'
PORT=4000
```

### Testing
- **Unit Tests**: `backend/test/` directory (Jest)
  - Run: `cd backend && npm test`
  - Key tests: `integration.mood.test.js` (mood endpoint), `stressDetector.test.js`
- **Smoke Tests**: PowerShell scripts (`test-smoke.ps1`, `test-smoke-advanced.ps1`)
  - Test all 3 AI features end-to-end
  - Verify LLM generation works
  - Check SSE broadcasts

### Data Management
- **Clear User Data**: POST `/mood/clear?userId=X` (frontend calls this with confirmation)
- **Reset All Data**: Manually delete/truncate `backend/src/data/data.json`
- **Backup**: Data persists in single JSON file (keep backups before clearing)

---

## Project-Specific Conventions

### Error Handling
- Routes return `{ error: 'message' }` on 4xx errors
- LLM failures gracefully degrade to fallback deterministic responses
- No exceptions thrown to client; always return structured JSON responses

### Stress Detection Rules
From `services/stressDetector.js`:
- **Rule 1**: If 2+ of last 3 entries have stress ≥4 → triggers alert
- **Rule 2**: If mood variance ≥2 across last 4 entries → triggers alert

### Database-like Patterns
- No database; JSON file is single source of truth
- Read/write operations use `fs-extra` (ensures file/folder creation)
- All user data is indexed by userId as top-level key
- **Important**: Concurrent writes may cause data loss; not production-ready without SQLite/PostgreSQL

### Mood/Stress Scales
- **Mood**: 0-4 (very sad → very happy), typically mapped to emoji
- **Stress**: 0-5 (relaxed → very stressed), labeled: "Relaxed", "Calm", "Neutral", "Concerned", "Stressed", "Very Stressed"

---

## Common Pitfalls & Solutions

| Issue | Prevention |
|-------|-----------|
| Missing userId → 401 errors | Always pass userId in query or body |
| LLM not responding | Check `.env` file exists + API keys set. System auto-fallbacks to deterministic responses |
| SSE stream not connecting | Frontend must call `new EventSource('/team-alerts/stream')` before events fire |
| Stale mood data in frontend | Call `setRefreshKey(prev => prev + 1)` to trigger useEffect reload |
| Data.json corrupted (bad JSON) | Replace with `{}` and re-test. Check file permissions |

---

## Quick Command Reference

```bash
# Development
cd backend && npm run dev      # Start backend with hot reload
cd frontend && npm run start   # Start frontend Vite server
npm test                       # Run Jest tests (from backend/)

# Manual API Testing (PowerShell)
$body = @{ mood = 3; stress = 2 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:4000/mood?userId=test" `
  -Method POST -ContentType "application/json" -Body $body

# Smoke Tests
.\test-smoke.ps1              # Basic feature test
.\test-smoke-advanced.ps1     # Full AI integration test
```

---

## When Extending the Codebase

1. **Adding a new route**: Create file in `backend/src/routes/`, require in `server.js`
2. **Adding a service**: Create in `backend/src/services/`, export functions
3. **Using LLM**: Import `llm.js` and call `generateChatReply()` or `generateSummary()`
4. **Adding frontend tab**: Create component in `frontend/src/components/`, add to App.jsx tabs
5. **Storing user data**: Use existing `readData()` / `writeData()` pattern in routes (indexed by userId)

**Golden Rule**: Keep userId as first-class citizen throughout the stack (query param → service → storage).
