const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// Normalize env values to avoid trailing space issues causing redirect_uri_mismatch
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
const GOOGLE_REDIRECT_URI = (process.env.GOOGLE_REDIRECT_URI || '').trim();

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// Generate auth URL
router.get('/auth-url', (req, res) => {
  try {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.nutrition.read',
      'https://www.googleapis.com/auth/fitness.sleep.read'
    ];
    
    console.log('🔐 [OAuth] Generating auth URL');
    console.log('   Client ID:', GOOGLE_CLIENT_ID ? '✓ Loaded' : '✗ MISSING');
    console.log('   Client Secret:', GOOGLE_CLIENT_SECRET ? '✓ Loaded' : '✗ MISSING');
    console.log('   Redirect URI:', GOOGLE_REDIRECT_URI || '[NOT SET]');
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
    
    console.log('✅ [OAuth] Auth URL generated successfully');
    res.json({ authUrl });
  } catch (err) {
    console.error('❌ [OAuth] Auth URL error:', err.message);
    res.status(500).json({ error: 'Failed to generate auth URL', details: err.message });
  }
});

// Handle OAuth callback (GET from Google redirect)
router.get('/callback', async (req, res) => {
  const { code, error, state } = req.query;
  
  console.log('🔐 [OAuth] Callback received');
  console.log('   Code:', code ? '✓ Received' : '✗ MISSING');
  console.log('   Error:', error || 'None');
  console.log('   State:', state || 'None');
  
  if (error) {
    console.error('❌ [OAuth] Authorization error:', error);
    return res.send(`
      <html>
        <head><title>Authorization Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Authorization Error</h1>
          <p>${error}</p>
          <p><small>You can close this window</small></p>
          <script>
            setTimeout(() => {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_ERROR',
                error: '${error}'
              }, '*');
              window.close();
            }, 1000);
          </script>
        </body>
      </html>
    `);
  }
  
  if (!code) {
    console.error('❌ [OAuth] No authorization code received');
    return res.status(400).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Error</h1>
          <p>Authorization code is required</p>
          <p><small>You can close this window</small></p>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: 'No authorization code received'
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `);
  }
  
  try {
    console.log('🔐 [OAuth] Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ [OAuth] Tokens received successfully');
    
    // Set credentials to fetch user info
    oauth2Client.setCredentials(tokens);
    
    // Get user info using OAuth2
    console.log('🔐 [OAuth] Fetching user information...');
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const email = userInfo.data.email;
    const name = userInfo.data.name || userInfo.data.given_name || 'User';
    const userId = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    console.log(`✅ [OAuth] User authenticated: ${email} (ID: ${userId})`);
    console.log(`✅ [OAuth] Google Fit access token: ${tokens.access_token.substring(0, 20)}...`);
    
    // Send success message with auth data to popup opener
    const html = `
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              color: white;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              padding: 30px;
              border-radius: 10px;
              max-width: 400px;
              margin: 0 auto;
            }
            h1 { margin: 0; color: #4ade80; }
            p { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Authorization Successful!</h1>
            <p>Connecting to Mind Mate...</p>
            <p><small>This window will close automatically</small></p>
          </div>
          <script>
            const authData = {
              type: 'GOOGLE_AUTH_SUCCESS',
              userId: '${userId}',
              email: '${email}',
              name: '${name}',
              googleAccessToken: '${tokens.access_token}'
            };
            console.log('Sending auth data to parent window:', authData);
            window.opener.postMessage(authData, '*');
            localStorage.setItem('googlefit_token', '${tokens.access_token}');
            setTimeout(() => {
              console.log('Closing popup window');
              window.close();
            }, 1500);
          </script>
        </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    console.error('❌ [OAuth] Callback error:', err);
    console.error('   Error code:', err.code);
    console.error('   Error message:', err.message);
    
    const errorHtml = `
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
              color: white;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              padding: 30px;
              border-radius: 10px;
              max-width: 400px;
              margin: 0 auto;
            }
            h1 { margin: 0; }
            p { margin: 10px 0; }
            .error-details { font-size: 12px; margin-top: 20px; color: #fee; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Authentication Failed</h1>
            <p>Unable to complete Google authentication</p>
            <div class="error-details">
              <p><strong>Error:</strong> ${err.message}</p>
            </div>
            <p><small>You can close this window and try again</small></p>
          </div>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: '${err.message}'
            }, '*');
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `;
    res.status(400).send(errorHtml);
  }
});

// POST callback for frontend to exchange code (alternative method)
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    console.error('❌ [OAuth] POST callback: No code provided');
    return res.status(400).json({ error: 'Authorization code required' });
  }
  
  try {
    console.log('🔐 [OAuth] POST callback: Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const email = userInfo.data.email;
    const name = userInfo.data.name || userInfo.data.given_name || 'User';
    const userId = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    console.log(`✅ [OAuth] POST callback successful for ${email}`);
    
    res.json({
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      userId,
      email,
      name
    });
  } catch (err) {
    console.error('❌ [OAuth] POST callback error:', err.message);
    res.status(400).json({ error: 'Failed to get tokens', details: err.message });
  }
});

module.exports = router;
