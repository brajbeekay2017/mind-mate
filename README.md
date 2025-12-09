# Mind Mate — Project scaffold

This workspace contains a minimal scaffold generated from the Project Starter doc.

Backend (Node.js + Express)
- Path: `backend`
- To run:
  1. cd backend
  2. npm install
  3. npm start

Frontend (Vite + React)
- Path: `frontend`
- To run:
  1. cd frontend
  2. npm install
  3. npm run start

Notes
- The LLM wrapper is a deterministic placeholder. Add OpenAI integration in `backend/src/services/llm.js` if desired.
- Data is stored in `backend/src/data/data.json` as a simple JSON file.
