# FIX: Google OAuth redirect_uri_mismatch Error

## The Problem
You're seeing: **"Error 400: redirect_uri_mismatch"**

This means Google Cloud Console doesn't have `http://localhost:4000/callback` registered as an authorized redirect URI for your OAuth application.

## The Solution - Step by Step

### Step 1: Open Google Cloud Console
1. Go to: **https://console.cloud.google.com/**
2. Make sure you're logged in with the same Google account used for the project

### Step 2: Select Your Project
1. At the top left, click the **project dropdown**
2. Find and select your project (it should contain "mind-mate" or "wellness" in the name)
3. Look for your project ID from your GOOGLE_CLIENT_ID

### Step 3: Navigate to OAuth Credentials
1. In the left sidebar, click **APIs & Services**
2. Click **Credentials**

### Step 4: Edit Your OAuth 2.0 Client ID
1. Look for the OAuth 2.0 Client ID entry
   - It should show your client ID (ends with .apps.googleusercontent.com)
2. Click on it to open the details

### Step 5: Add the Redirect URI
1. Find the section: **"Authorized redirect URIs"**
2. Click **"+ ADD URI"** button
3. Enter exactly: **`http://localhost:4000/callback`**
4. Click **SAVE**

### Step 6: Verify Your Redirect URIs
After saving, you should see in the list:
- ✅ `http://localhost:4000/callback` (NEW - just added)
- Any other URIs that were already there

## Important Notes

⚠️ **Exact Match Required:**
- Must be exactly: `http://localhost:4000/callback`
- Not: `http://localhost:4000/` (missing `/callback`)
- Not: `http://localhost:3000/callback` (wrong port)
- Not: `https://localhost:4000/callback` (wrong protocol - must be http for localhost)

## After Adding the Redirect URI

1. **Wait 30 seconds** for Google to update its systems
2. Go back to: `http://localhost:5173`
3. Click "Sign in with Google" again
4. You should now be able to complete the OAuth flow
5. Backend logs should show: `✅ [OAuth] User authenticated: [your-email]`

## Verify Current Configuration

Your application is configured for:
```
Frontend: http://localhost:5173
Backend: http://localhost:4000
OAuth Callback: http://localhost:4000/callback
Client ID: 447633337080-66f3qlv3d60mcr39lgqaifrprrocu7gh.apps.googleusercontent.com
```

## Debugging: Check Backend Logs

When testing OAuth, look for these logs in your backend terminal:

```
✅ [OAuth] Auth URL generated successfully
🔐 [OAuth] Callback received
   Code: ✓ Received
✅ [OAuth] Tokens received successfully
✅ [OAuth] User authenticated: [email@domain.com]
```

If you see: `❌ [OAuth] Authorization error: redirect_uri_mismatch`
- This means Google Cloud Console still doesn't have the URI registered
- Wait a moment and try again, or clear browser cache (Ctrl+Shift+Del)

## Still Having Issues?

1. **Clear browser cache** (Ctrl+Shift+Del on Windows/Linux, Cmd+Shift+Del on Mac)
2. **Restart both servers:**
   ```powershell
   # Stop current servers
   Get-Process node | Stop-Process -Force
   
   # Restart backend
   cd backend
   npm start
   
   # In another terminal, restart frontend
   cd frontend
   npm start
   ```
3. **Try OAuth again** from http://localhost:5173

## Alternative: If Multiple URIs are Needed

If testing with different configurations, you can add multiple URIs:
- `http://localhost:4000/callback` (local development)
- `http://localhost:3000/callback` (if using different port)
- `https://yourdomain.com/callback` (for production)

Only `http://localhost:4000/callback` is needed for current development setup.

## Quick Checklist

- [ ] Logged into Google Cloud Console
- [ ] Selected correct project (your project)
- [ ] Navigated to APIs & Services → Credentials
- [ ] Found OAuth 2.0 Client ID
- [ ] Added `http://localhost:4000/callback` to authorized URIs
- [ ] Clicked SAVE
- [ ] Waited 30 seconds
- [ ] Restarted backend server
- [ ] Cleared browser cache
- [ ] Tested OAuth flow again

## Contact Support

If you need help with Google Cloud Console:
1. Google Cloud Documentation: https://cloud.google.com/docs
2. OAuth 2.0 Setup Guide: https://developers.google.com/identity/protocols/oauth2
3. Google Cloud Support: https://cloud.google.com/support

---

**Your Client Details:**
- Client ID: `[Your client ID from Google Cloud Console]`
- Redirect URI: `http://localhost:4000/callback`
- API: Google Fit API + Google Identity
- Environment: Local Development (localhost)
