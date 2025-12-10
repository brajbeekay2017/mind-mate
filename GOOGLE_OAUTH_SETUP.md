# Google OAuth Setup for Mind Mate

## Error Resolution: redirect_uri_mismatch

If you're seeing the error **"Error 400: redirect_uri_mismatch"**, it means the redirect URI in Google Cloud Console doesn't match what we're sending.

### Current Configuration

**Backend Redirect URI:** `http://localhost:4000/callback`

### Steps to Fix

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Navigate to OAuth 2.0 Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID

3. **Add Redirect URI:**
   - Find the **Authorized redirect URIs** section
   - Add this URI: **`http://localhost:4000/callback`**
   - Click **Save**

4. **Verify Authorized URIs:**
   Make sure you have these URIs authorized:
   - ✅ `http://localhost:4000/callback` (primary - for OAuth flow)
   - ✅ `http://localhost:4000` (for localhost testing)

5. **Verify Application Scopes:**
   - Go to **OAuth consent screen** → **Scopes**
   - Ensure these scopes are authorized:
     - `https://www.googleapis.com/auth/fitness.activity.read`
     - `https://www.googleapis.com/auth/fitness.heart_rate.read`
     - `https://www.googleapis.com/auth/fitness.sleep.read`
     - `profile`
     - `email`

6. **Test the OAuth Flow:**
   - Go to `http://localhost:5173`
   - Click "Sign in with Google"
   - You should now be able to authorize the app

## Environment Variables

These are already set in `.env`:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/callback
```

## OAuth Flow Diagram

```
1. User clicks "Sign in with Google"
   ↓
2. Frontend opens popup to Google OAuth consent screen
   ↓
3. User authorizes Mind Mate app
   ↓
4. Google redirects to: http://localhost:4000/callback?code=...
   ↓
5. Backend receives authorization code
   ↓
6. Backend exchanges code for access token
   ↓
7. Backend retrieves user info
   ↓
8. Backend sends success message back to popup
   ↓
9. Popup closes, user is logged in with Google Fit connected
```

## Troubleshooting

### Issue: "redirect_uri_mismatch"
- **Cause:** The redirect URI in Google Cloud Console doesn't match `http://localhost:4000/callback`
- **Solution:** Add `http://localhost:4000/callback` to authorized URIs in Google Cloud Console

### Issue: "Popup blocked"
- **Cause:** Browser is blocking the popup window
- **Solution:** Allow popups for `http://localhost:5173` in browser settings

### Issue: "Failed to get Google authentication URL"
- **Cause:** Backend is not running or environment variables are not loaded
- **Solution:** Make sure backend is running with `npm start` from the backend folder

### Issue: Tokens are not being saved
- **Cause:** The OAuth callback message is not reaching the main window
- **Solution:** Check browser console for JavaScript errors, ensure popups are allowed

## Development Notes

- **Frontend Port:** 5173 (Vite dev server)
- **Backend Port:** 4000 (Node.js Express server)
- **OAuth Redirect:** http://localhost:4000/callback
- **Google Fit Scopes:** activity.read, heart_rate.read, sleep.read, nutrition.read
- **Token Storage:** Stored in localStorage as `googlefit_token`
- **User Storage:** Stored in localStorage as `mindmate_user` (JSON with userId, email, name)

## Next Steps After OAuth Setup

Once OAuth is working:

1. Google Fit data will be automatically fetched
2. User's mood entries will be connected to Google Fit metrics
3. Stress alerts will use both mood data and fitness data
4. Recovery challenges will be personalized based on fitness levels

## Support

If issues persist:
1. Check browser console for errors (F12 → Console tab)
2. Check backend logs for OAuth errors
3. Verify all environment variables are loaded (backend logs show this on startup)
4. Ensure Google Cloud project has Google Fit API enabled
