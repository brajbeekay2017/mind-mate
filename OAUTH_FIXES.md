# Google OAuth Authentication Fixes

## Issues Resolved

### 1. **Duplicate Route Handlers** ✅
**Problem:** The `googleAuth.js` file had multiple handlers for the same `/callback` route, causing conflicts.

**Solution:** Consolidated into a single clean implementation with:
- One GET handler for OAuth redirect callback
- One POST handler for alternative code exchange
- All duplicate code removed

### 2. **Improved Error Handling** ✅
**Backend Changes:**
- Added comprehensive logging at each OAuth step
- Enhanced error messages with specific details
- Better handling of missing code/error parameters
- Error responses now include context for debugging

**Frontend Changes:**
- Added error message listener for `GOOGLE_AUTH_ERROR`
- Improved console logging for debugging
- Better error display to user
- Loading state properly managed in all scenarios

### 3. **Better Error Communication** ✅
**Callback HTML:**
- Styled error pages with visual feedback
- Error details shown in popup before closing
- Both success and error pages post messages back to parent window
- Proper state transitions on main window

### 4. **Missing Profile/Email Scopes** ✅
**Added scopes:**
```javascript
'https://www.googleapis.com/auth/userinfo.profile',
'https://www.googleapis.com/auth/userinfo.email'
```
These are required to fetch user info (name, email) from Google.

## Current Implementation

### Backend Flow
```
1. /google-auth/auth-url (GET)
   ↓
   Generates Google OAuth URL with all scopes
   Returns authUrl in JSON

2. /callback (GET)
   ↓
   Google redirects user here with authorization code
   Exchanges code for tokens
   Fetches user info
   Sends postMessage to parent window with auth data
   OR sends error message if authentication fails

3. /callback (POST)
   ↓
   Alternative endpoint for frontend to exchange code
   Returns tokens and user info in JSON
```

### Frontend Flow
```
1. User clicks "Sign in with Google"
   ↓
   setLoading(true)
   Fetch /google-auth/auth-url

2. Backend returns authUrl
   ↓
   window.open(authUrl) in popup

3. User authorizes on Google
   ↓
   Google redirects to /callback with code

4. Backend processes code, gets tokens
   ↓
   Sends postMessage('GOOGLE_AUTH_SUCCESS') or error

5. Main window receives message
   ↓
   Stores tokens and user data
   Calls onLogin(userId)
   ✅ User authenticated!
```

## Testing the Fix

1. **Backend is running:**
   ```
   ✅ Mind Mate backend listening on port 4000
   ✅ OAuth debug logging enabled
   ```

2. **Frontend is running:**
   ```
   ✅ VITE dev server at http://localhost:5173
   ✅ Hot reload enabled
   ```

3. **To test OAuth:**
   - Go to `http://localhost:5173`
   - Click "Sign in with Google"
   - Check browser console (F12 → Console) for detailed logs
   - Backend logs will show OAuth flow progress

## Console Logs to Look For

### Successful Flow
```
🔐 [OAuth] Generating auth URL
✅ [OAuth] Auth URL generated successfully
🔐 [OAuth] Callback received
   Code: ✓ Received
🔐 [OAuth] Exchanging authorization code for tokens...
✅ [OAuth] Tokens received successfully
🔐 [OAuth] Fetching user information...
✅ [OAuth] User authenticated: [email@domain.com] (ID: [userid])
```

### Error Examples
```
❌ [OAuth] Authorization error: [error_description]
❌ [OAuth] No authorization code received
❌ [OAuth] Callback error: [error_message]
```

## Common Issues & Solutions

### Issue 1: "Failed to get Google authentication URL"
**Causes:**
- Backend not running
- Environment variables not loaded
- Network connectivity issue

**Fix:**
- Ensure backend is running: `npm start` in backend folder
- Check `.env` file has GOOGLE_CLIENT_ID and SECRET
- Restart backend after any `.env` changes

### Issue 2: "redirect_uri_mismatch"
**Causes:**
- Google Cloud Console doesn't have `http://localhost:4000/callback` registered

**Fix:**
- Go to https://console.cloud.google.com/
- APIs & Services → Credentials
- Edit your OAuth 2.0 Client ID
- Add `http://localhost:4000/callback` to authorized redirect URIs
- Save changes

### Issue 3: "Popup blocked"
**Causes:**
- Browser popup blocker active
- Popup opened from non-user action

**Fix:**
- Allow popups for `http://localhost:5173` in browser
- Make sure button click triggers the login immediately

### Issue 4: Popup closes immediately without error
**Causes:**
- postMessage not reaching parent window
- Parent window no longer listening for messages
- CORS issue

**Fix:**
- Check browser console for JavaScript errors
- Ensure message listener is registered in main window
- Check that `window.opener` exists in popup

## Environment Setup Verification

Run this to verify environment:

```powershell
# Backend verification
cd backend
cat .env

# Should show:
# GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=your-client-secret
# GOOGLE_REDIRECT_URI=http://localhost:4000/callback
```

## Code Changes Summary

**Files Modified:**
1. `backend/src/routes/googleAuth.js`
   - Removed duplicate handlers
   - Added comprehensive logging
   - Improved error handling
   - Added missing profile/email scopes

2. `frontend/src/components/LoginPage.jsx`
   - Enhanced message listener for errors
   - Better error handling
   - Improved debug logging
   - Better loading state management

3. `backend/src/server.js`
   - Added explicit `/callback` GET route
   - Proper redirect handling for OAuth flow

4. `backend/.env`
   - Updated GOOGLE_REDIRECT_URI to `http://localhost:4000/callback`

## Next Steps

After authentication succeeds:
1. ✅ User data stored in localStorage
2. ✅ Google Fit token stored and available
3. ✅ Main app loads with user context
4. ✅ Fitness data can be fetched
5. ✅ Mood + fitness integration active

## Debug Mode

To enable more detailed logging, add to backend server.js:

```javascript
// Before route handlers
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

Or check real-time logs by tailing the backend:
```powershell
npm start  # All logs displayed directly
```
