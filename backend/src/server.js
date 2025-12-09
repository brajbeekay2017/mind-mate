const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Load .env from backend folder
const dotenvPath = path.resolve(__dirname, '../.env');
console.log(`📁 .env file path: ${dotenvPath}`);
console.log(`📁 .env exists: ${fs.existsSync(dotenvPath)}`);

require('dotenv').config({ path: dotenvPath });

// Debug: Log raw environment variables
console.log('\n🔍 Environment Check:');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? `[LOADED - ${process.env.GROQ_API_KEY.substring(0, 10)}...]` : '[NOT FOUND]');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `[LOADED - ${process.env.OPENAI_API_KEY.substring(0, 10)}...]` : '[NOT FOUND]');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '[LOADED]' : '[NOT FOUND]');
console.log('PORT:', process.env.PORT || '[DEFAULT 4000]');
console.log();

const moodRouter = require('./routes/mood');
const chatRouter = require('./routes/chat');
const summaryRouter = require('./routes/summary');
const loginRouter = require('./routes/login');
const googleAuthRouter = require('./routes/googleAuth');
const googleFitRouter = require('./routes/googleFit');
const stressRecoveryRouter = require('./routes/stressRecovery');
const teamAlertsRouter = require('./routes/teamAlerts');
const recommendationsRouter = require('./routes/recommendations');
const stressAlertsRouter = require('./routes/stressAlerts');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/login', loginRouter);
app.use('/mood', moodRouter);
app.use('/chat', chatRouter);
app.use('/summary', summaryRouter);
app.use('/google-auth', googleAuthRouter);
app.use('/google-fit', googleFitRouter);
app.use('/stress-recovery', stressRecoveryRouter);
app.use('/team-alerts', teamAlertsRouter);
app.use('/recommendations', recommendationsRouter);
app.use('/alerts', stressAlertsRouter);

// Root handler for health check
app.get('/', (req, res) => {
  // If there's a code query parameter, it's the Google OAuth callback
  if (req.query.code) {
    // Redirect to google-auth callback
    return res.redirect(`/google-auth/callback?${Object.keys(req.query).map(k => `${k}=${req.query[k]}`).join('&')}`);
  }
  res.json({ message: 'Mind Mate Backend is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// If run directly, start the server
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Mind Mate backend listening on port ${PORT}`);
  });
}
