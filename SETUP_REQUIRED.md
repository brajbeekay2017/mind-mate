# REQUIRED: Complete This Setup to Fix OAuth Error

## Current Status
- ✅ Backend: Running correctly on port 4000
- ✅ Frontend: Running on port 5173
- ✅ OAuth URL generation: Working
- ❌ Google Cloud Console: **NEEDS UPDATE** - Missing redirect URI

## The Error You're Seeing
```
Error 400: redirect_uri_mismatch
```

**Why?** Google doesn't recognize `http://localhost:4000/callback` as a valid redirect destination.

## REQUIRED ACTION: Add Redirect URI to Google Cloud Console

### 🔗 Direct Links
- **Google Cloud Console:** https://console.cloud.google.com/
- **Your Project Settings:** https://console.cloud.google.com/apis/credentials
- **OAuth 2.0 Documentation:** https://developers.google.com/identity/protocols/oauth2

### ✋ Step-by-Step Instructions

#### 1. Open Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account

#### 2. Select Your Project
- Look at the top-left corner
- Click the project dropdown
- Find your project or search for ID: `447633337080`
- Click to select it

#### 3. Go to Credentials
- In the left sidebar, expand **APIs & Services**
- Click **Credentials**

#### 4. Find Your OAuth Client
You should see a list of credentials. Look for:
- Type: **OAuth 2.0 Client ID**
- Application type: **Web application**
- Client ID: `your-client-id.apps.googleusercontent.com`

Click on it to open the details.

#### 5. Locate Authorized Redirect URIs Section
You should see a section titled: **"Authorized redirect URIs"**

Current URIs might show:
- (empty)
- or other URIs like `http://localhost:3000/callback`

#### 6. Add the New URI
- Click the **+ ADD URI** button
- In the text field, type exactly:
  ```
  http://localhost:4000/callback
  ```
  (Copy-paste to avoid typos)

#### 7. Save
- Click the **SAVE** button
- Wait for confirmation

#### 8. Verify
After saving, the list should show:
```
Authorized redirect URIs:
  • http://localhost:4000/callback
  (plus any other URIs that were already there)
```

### ⏱️ Wait for Update
Google usually updates within 30 seconds, but sometimes takes a few minutes.

### 🧪 Test OAuth Again
1. Wait 30 seconds
2. Clear browser cache (Ctrl+Shift+Del)
3. Go to: http://localhost:5173
4. Click "Sign in with Google"
5. Complete the authentication

### 📋 Expected Outcome
If successful, you'll see:
- Google authorization screen (first time only)
- Authorization popup closes
- Back to main app
- Backend logs show: `✅ [OAuth] User authenticated: [your-email]`

## Verification Checklist

Complete this checklist as you follow the steps:

```
Google Cloud Console Setup
[ ] Opened https://console.cloud.google.com/
[ ] Selected correct project (ID: 447633337080-...)
[ ] Navigated to APIs & Services
[ ] Clicked on Credentials
[ ] Found the OAuth 2.0 Client ID
[ ] Clicked to open its details
[ ] Located "Authorized redirect URIs" section
[ ] Clicked "+ ADD URI"
[ ] Typed exactly: http://localhost:4000/callback
[ ] Clicked SAVE
[ ] Saw confirmation message
[ ] Waited 30 seconds

Testing OAuth
[ ] Cleared browser cache (Ctrl+Shift+Del)
[ ] Restarted backend (npm start in backend folder)
[ ] Restarted frontend (npm start in frontend folder)
[ ] Opened http://localhost:5173
[ ] Clicked "Sign in with Google"
[ ] Completed Google authorization
[ ] Popup closed automatically
[ ] Returned to main app
[ ] Backend logs show authentication success
```

## If It Still Doesn't Work

### Check 1: Verify Backend Configuration
```powershell
cd backend
cat .env
```
Should show:
```
GOOGLE_REDIRECT_URI=http://localhost:4000/callback
```

### Check 2: Verify Console Has the URI
- Go back to Google Cloud Console
- Credentials → Your OAuth Client
- Scroll down to "Authorized redirect URIs"
- Make sure `http://localhost:4000/callback` is listed

### Check 3: Clear Everything
```powershell
# Stop servers
Get-Process node | Stop-Process -Force

# Clear browser cache
# Press Ctrl+Shift+Del in browser
# Select "All time"
# Click "Clear data"

# Restart servers
cd backend
npm start

# In new terminal:
cd frontend
npm start

# Try OAuth again
```

### Check 4: Check Backend Logs
When you try to sign in, look at backend terminal for:

**Success logs:**
```
🔐 [OAuth] Callback received
   Code: ✓ Received
✅ [OAuth] Tokens received successfully
✅ [OAuth] User authenticated: [email@domain.com]
```

**Error logs:**
```
❌ [OAuth] Authorization error: redirect_uri_mismatch
```

If you see `redirect_uri_mismatch` error, the Google Cloud Console still needs updating.

## Your Configuration

**Frontend:**
- URL: `http://localhost:5173`
- Button: "Sign in with Google"
- Action: Opens popup to Google

**Backend:**
- URL: `http://localhost:4000`
- OAuth Endpoint: `/google-auth/auth-url`
- Callback Endpoint: `/google-auth/callback`
- Redirect URI (registered): `http://localhost:4000/callback`

**Google Cloud Console:**
- Project ID: `your-project-id`
- Client ID: `your-client-id.apps.googleusercontent.com`
- Client Secret: `your-client-secret`
- Scopes: Google Fit (activity, heart_rate, sleep, nutrition) + Profile + Email

## Support Resources

If you need help:

1. **Google OAuth Documentation:**
   https://developers.google.com/identity/protocols/oauth2/web-server

2. **Google Fit API Setup:**
   https://developers.google.com/fit/rest/v1/get-started

3. **Google Cloud Console Help:**
   https://cloud.google.com/docs/authentication/oauth2

4. **Troubleshooting OAuth Errors:**
   https://developers.google.com/identity/protocols/oauth2/troubleshooting

---

**IMPORTANT:** The redirect URI mismatch error is 100% solved by adding the URI to Google Cloud Console. Once you complete these steps, OAuth will work immediately.

After setup is complete, the full OAuth flow is:
1. User clicks "Sign in with Google"
2. Popup opens to Google's authorization screen
3. User clicks "Allow"
4. Google redirects to `http://localhost:4000/callback` with authorization code
5. Backend exchanges code for tokens
6. Backend sends tokens to frontend via postMessage
7. Frontend closes popup and logs in user ✅
