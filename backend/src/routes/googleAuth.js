const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate auth URL
router.get('/auth-url', (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.nutrition.read',
      'https://www.googleapis.com/auth/fitness.sleep.read'
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
    
    res.json({ authUrl });
  } catch (err) {
    console.error('Auth URL error:', err);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Handle OAuth callback (GET from Google redirect)
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.send(`<html><body><h1>Authorization Error</h1><p>${error}</p><script>window.close();</script></body></html>`);
  }
  
  if (!code) {
    return res.status(400).send('<html><body><h1>Error</h1><p>Authorization code required</p></body></html>');
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Send success message and store token
    const html = `
      <html>
        <head><title>Authorization Successful</title></head>
        <body>
          <h1>✓ Authorization Successful!</h1>
          <p>You can now close this window.</p>
          <script>
            const accessToken = '${tokens.access_token}';
            localStorage.setItem('googlefit_token', accessToken);
            window.opener.postMessage({ type: 'GOOGLE_FIT_AUTH', accessToken }, '*');
            setTimeout(() => window.close(), 1000);
          </script>
        </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.status(400).send(`<html><body><h1>Error</h1><p>Failed to get tokens: ${err.message}</p><script>window.close();</script></body></html>`);
  }
});

// POST callback for frontend to exchange code (alternative method)
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.json({ success: true, accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.status(400).json({ error: 'Failed to get tokens' });
  }
});

// Handle OAuth callback (GET from Google redirect)
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.send(`<html><body><h1>Authorization Error</h1><p>${error}</p></body></html>`);
  }
  
  if (!code) {
    return res.status(400).send('<html><body><h1>Error</h1><p>Authorization code required</p></body></html>');
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store token in localStorage on frontend
    const html = `
      <html>
        <body>
          <h1>Authorization Successful!</h1>
          <p>You can now close this window.</p>
          <script>
            const accessToken = '${tokens.access_token}';
            localStorage.setItem('googlefit_token', accessToken);
            window.close();
          </script>
        </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.status(400).send(`<html><body><h1>Error</h1><p>Failed to get tokens: ${err.message}</p></body></html>`);
  }
});

// POST callback for frontend to exchange code
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.json({ success: true, accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.status(400).json({ error: 'Failed to get tokens' });
  }
});

module.exports = router;
