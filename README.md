# Mind Mate - Workplace Wellness Application v2.0

AI-powered workplace wellness platform combining mood tracking, stress management, Google Fit integration, and team health monitoring.

## 🌟 Features

- **Mood & Stress Tracking**: Daily mood entries with AI-powered insights
- **Google Fit Integration**: Automatic fitness data synchronization
- **AI Chat Support**: Wellness coaching powered by multiple LLM providers (Groq, OpenAI, Claude)
- **Stress Recovery Challenges**: Personalized 3-day wellness programs
- **Team Health Alerts**: Real-time monitoring and notifications for team wellbeing
- **Smart Recommendations**: AI-generated wellness suggestions
- **Historic Calendar**: Visual mood history with color-coded entries
- **Breathing Exercises**: Interactive relaxation tools

## 🚀 Tech Stack

### Frontend
- **React 18** with Vite
- **Chart.js** for data visualization
- **React Markdown** for formatted responses
- **EventSource API** for real-time updates (SSE)

### Backend
- **Node.js** + Express
- **Google OAuth 2.0** for authentication
- **Google Fit API** for health data
- **Multi-LLM Support**: Groq (primary), OpenAI, Claude with auto-fallback
- **Server-Sent Events (SSE)** for real-time streaming

## 📋 Prerequisites

- Node.js 18+ and npm
- Google Cloud Console project with:
  - OAuth 2.0 credentials
  - Fitness API enabled
- API keys for LLM providers (at least one):
  - Groq API key (free, recommended)
  - OpenAI API key
  - Claude API access (optional)

## 🛠️ Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/brajbeekay2017/mind-mate.git
cd mind-mate
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file (copy from .env.example)
cp .env.example .env
# Edit .env and add your API keys
```

**Backend .env**:
```env
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/google-auth/callback
PORT=4000
NODE_ENV=development
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Run Development Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

Access app at: http://localhost:5173

## 📦 Production Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed deployment instructions for:
- ✅ Vercel + Railway (Free, Recommended)
- ✅ Linux Server (Ubuntu + Nginx + PM2)
- ✅ Windows IIS

### Quick Deploy to Vercel + Railway

```bash
# Deploy backend to Railway
# 1. Sign up at https://railway.app
# 2. Connect GitHub repo
# 3. Add environment variables from .env.example

# Deploy frontend to Vercel
cd frontend
echo "VITE_API_URL=https://your-railway-url.up.railway.app" > .env.production
npm install -g vercel
vercel --prod
```

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable APIs:
   - Google+ API
   - Fitness API
3. Create OAuth 2.0 credentials
4. Add authorized URIs:
   - **JavaScript origins**: `http://localhost:5173`, `https://yourdomain.com`
   - **Redirect URIs**: `http://localhost:4000/google-auth/callback`, `https://your-backend/google-auth/callback`

## 📚 API Documentation

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/mood` | GET/POST | Mood entries |
| `/chat` | POST | AI chat |
| `/summary` | GET | Mood summary |
| `/recommendations` | GET | Smart suggestions |
| `/stress-recovery/start` | POST | Start challenge |
| `/team-alerts/stream` | GET | SSE stream |
| `/google-fit/*` | GET | Fitness data |
| `/privacy` | GET | Privacy policy |

## 🧪 Testing

```bash
cd backend
npm test

# Smoke tests
powershell -File ../test-smoke.ps1
```

## 📊 Project Structure

```
mind-mate/
├── backend/
│   ├── src/
│   │   ├── server.js              # Main Express server
│   │   ├── routes/                # API routes
│   │   │   ├── mood.js
│   │   │   ├── chat.js
│   │   │   ├── googleAuth.js
│   │   │   └── ...
│   │   ├── services/              # Business logic
│   │   │   ├── llm.js             # Multi-LLM handler
│   │   │   ├── stressDetector.js
│   │   │   └── ...
│   │   └── data/
│   │       └── data.json          # User data storage
│   └── test/                      # Unit tests
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main app component
│   │   ├── components/
│   │   │   ├── MoodInput.jsx
│   │   │   ├── ChatPanel.jsx
│   │   │   ├── GoogleFitPanel.jsx
│   │   │   └── ...
│   │   └── config.js              # API configuration
│   └── dist/                      # Production build
├── privacy.html                   # Privacy policy
├── DEPLOYMENT.md                  # Deployment guide
└── README.md                      # This file
```

## 🔧 Configuration

### Environment Variables

**Backend**:
- `GROQ_API_KEY`: Groq LLM API key
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth secret
- `GOOGLE_REDIRECT_URI`: OAuth callback URL
- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Frontend URL for CORS

**Frontend**:
- `VITE_API_URL`: Backend API URL

## 🐛 Troubleshooting

### Backend won't start
```bash
cd backend
node src/server.js
# Check error messages
```

### Frontend blank page
- Check browser console (F12)
- Verify `VITE_API_URL` in .env
- Ensure backend is running

### OAuth errors
- Verify redirect URIs in Google Console
- Check `GOOGLE_REDIRECT_URI` matches exactly

### Google Fit data not loading
- Enable Fitness API in Google Cloud Console
- Verify OAuth scopes include fitness permissions

## 📈 Performance

- **LLM Response**: ~2-5 seconds (Groq), ~5-10s (OpenAI)
- **Google Fit Sync**: Real-time on authentication
- **SSE Updates**: Instant team alert notifications
- **Page Load**: <2 seconds (production build)

## 🔒 Security

- OAuth 2.0 authentication
- HTTPS enforced in production
- API keys stored in .env (never committed)
- CORS configured for specific origins
- Rate limiting on sensitive endpoints
- Input validation and sanitization

## 📝 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

**Amitesh Singh**
- Email: amiteshsingh.smsit@gmail.com
- GitHub: [@brajbeekay2017](https://github.com/brajbeekay2017)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

- GitHub Issues: [Create an issue](https://github.com/brajbeekay2017/mind-mate/issues)
- Email: amiteshsingh.smsit@gmail.com

## 🙏 Acknowledgments

- Google Fit API for health data integration
- Groq for fast LLM inference
- OpenAI for GPT models
- Chart.js for beautiful visualizations
- React community for amazing tools

---

**Version**: 2.0  
**Last Updated**: December 2024  
**Status**: Production Ready ✅
