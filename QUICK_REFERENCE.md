# 🚀 Quick Reference Guide - Mind Mate AI Features

## One-Command Startup

```bash
# Terminal 1: Start Backend
cd d:\Projects\New\ folder1\mind-mate\backend && node src/server.js

# Terminal 2: Start Frontend
cd d:\Projects\New\ folder1\mind-mate\frontend && npm start

# Terminal 3: Run Smoke Tests (from project root)
powershell -ExecutionPolicy Bypass -File test-smoke-final.ps1
```

**URLs:**
- 🌐 Frontend: http://localhost:5173
- 🔌 Backend: http://localhost:4000

---

## API Endpoints Reference

### Stress Recovery Challenge
```
POST /stress-recovery/generate
  Payload: { userId, moodHistory[], latestStress }
  Returns: { challenge: { challengeName, difficulty, days[], expectedReduction } }

POST /stress-recovery/start
  Payload: { userId, challenge }
  Broadcasts SSE: { type: 'start', userId, challenge, timestamp }

POST /stress-recovery/complete
  Payload: { userId }
  Broadcasts SSE: { type: 'complete', userId, timestamp }
```

### Smart Recommendations
```
POST /recommendations/generate
  Payload: { userId, moodData[], journalData[] }
  Returns: { recommendations: { recommendations: [], summary: "" } }
```

### Team Alerts
```
GET /team-alerts/stream?userId=X&teamId=Y&isAdmin=Z
  Streams: SSE events with { channel, message, timestamp }

POST /team-alerts/alert
  Payload: { teamId, message, level: "warning|info|error" }
  Broadcasts SSE to team members
```

### Chat & Summary (Multi-Provider LLM)
```
POST /chat
  Payload: { message }
  Returns: { reply: "AI-generated response" }
  Uses: Groq → OpenAI → Claude → Fallback

GET /summary?userId=X
  Returns: { summary: "AI analysis", entriesAnalyzed }
  Uses: Multi-provider LLM
```

---

## Frontend Tabs & Components

| Tab | Component | Features |
|-----|-----------|----------|
| **Dashboard** | App.jsx (main) | Mood logging, trends, chat, summary, Google Fit |
| **Recovery** | StressRecoveryChallenge.jsx | Generate challenges, SSE updates, start/complete |
| **Recommendations** | SmartRecommendations.jsx | LLM-personalized wellness tips |
| **Alerts** | TeamAlertsPanel.jsx | Real-time alerts feed, admin posting (admin only) |

---

## Environment Variables

```env
# Required
GROQ_API_KEY=<your-groq-api-key>
OPENAI_API_KEY=<your-openai-api-key>

# Optional
CLAUDE_API_KEY=<your-claude-api-key>
CLAUDE_API_URL=https://api.claude.example.com/v1/messages
CLAUDE_MODEL=claude-4.5-haiku
LLM_PROVIDER=auto  # Options: auto, groq, openai, claude
```

---

## LLM Provider Priority (Auto Mode)

```
1. Groq (llama-3.1-8b-instant) ← Primary, fastest
   ↓ if fails
2. OpenAI (gpt-4o-mini) ← Fallback, reliable
   ↓ if fails
3. Claude (HTTP adapter) ← Optional, requires setup
   ↓ if all fail
4. Deterministic Responses ← Safe fallback, always works
```

---

## Test Verification

**Quick Test (10 requests):**
```powershell
powershell -ExecutionPolicy Bypass -File test-smoke-final.ps1
```

**Expected Output:**
```
✅ TEST 1: Health Check
✅ TEST 2: Generate Stress Recovery Challenge
✅ TEST 3: Start Challenge - SSE Broadcast
✅ TEST 4: Complete Challenge - SSE Broadcast
✅ TEST 5: Generate Smart Recommendations
✅ TEST 6: Post Team Alert - SSE Broadcast
✅ TEST 7: Chat Endpoint
✅ TEST 8: Summary Endpoint
✅ TEST 9: Mood Logging
✅ TEST 10: Get Mood History
```

All tests passing = ✅ System Ready

---

## Data Flow Architecture

```
User Action (Frontend)
    ↓
REST API Call (http://localhost:4000)
    ↓
Backend Route Handler
    ↓
Service Layer (LLM, Broadcaster, etc.)
    ↓
Response → Frontend
    ↓
SSE Broadcast (for events)
    ↓
Connected Clients Receive Live Updates
```

---

## File Structure (New Files)

```
Backend:
- backend/src/services/broadcast.js               (SSE broadcaster)
- backend/src/services/stressRecovery.js          (Challenge generator)
- backend/src/services/smartRecommendations.js    (Recommendation engine)
- backend/src/routes/stressRecovery.js            (Challenge endpoints)
- backend/src/routes/teamAlerts.js                (Alert endpoints)
- backend/src/routes/recommendations.js           (Recommendation endpoints)

Frontend:
- frontend/src/components/StressRecoveryChallenge.jsx
- frontend/src/components/TeamAlertsPanel.jsx
- frontend/src/components/SmartRecommendations.jsx

Modified:
- backend/src/services/llm.js                     (Multi-provider support)
- backend/src/server.js                           (New routes registration)
- frontend/src/App.jsx                            (Tab navigation)
```

---

## Troubleshooting

### Backend won't start on port 4000
```bash
# Check if port is in use
netstat -ano | findstr :4000

# Kill process using port
taskkill /PID <PID> /F
```

### LLM not responding
1. Check `.env` has `GROQ_API_KEY` and `OPENAI_API_KEY`
2. Verify API keys are valid
3. App will still work with fallback responses (deterministic)

### SSE not receiving events
1. Check browser console for errors
2. Verify backend is running on port 4000
3. Try a different browser or clear cache

### Smoke tests failing
1. Ensure backend is running: `node src/server.js`
2. Ensure frontend is running: `npm start`
3. Run test again: `powershell -ExecutionPolicy Bypass -File test-smoke-final.ps1`

---

## Performance Tips

- **Cache LLM responses** for identical prompts (future optimization)
- **Use Redis** for broadcaster if scaling to multiple servers
- **Enable gzip compression** in Express for API responses
- **Monitor API response times** to optimize LLM provider selection

---

## Security Notes (Current)

⚠️ **For Production:**
- [ ] Add JWT middleware to protected endpoints
- [ ] Implement rate limiting on LLM endpoints
- [ ] Add input validation on all APIs
- [ ] Use HTTPS/WSS for SSE
- [ ] Validate userId from authenticated session
- [ ] Add CORS restrictions (currently open)

---

## Support & Documentation

- 📖 Implementation Details: `IMPLEMENTATION_SUMMARY.md`
- 📊 Deployment Status: `DEPLOYMENT_STATUS.md`
- 🧪 Smoke Tests: `test-smoke-final.ps1`

---

**🎉 All systems operational. Happy coding!**
