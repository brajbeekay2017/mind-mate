# Visual Guide: Adding Redirect URI to Google Cloud Console

## What You Need to Do in 4 Screenshots Worth of Steps

### Step 1: Navigate to Google Cloud Console
**URL:** https://console.cloud.google.com/

What you'll see:
- Google Cloud logo in top left
- Project selector dropdown in top left (might say "Select a project")
- Left sidebar with navigation options

**Action:** Click the project selector dropdown and find your project

---

### Step 2: Select Your Project
**What to look for:**
- Project Name: Contains "mind-mate" or similar
- Project ID: Your Google Cloud project ID
- Status: "Active"

**Action:** Click on your project to select it

---

### Step 3: Go to APIs & Services > Credentials
**In the left sidebar:**
1. Find **"APIs & Services"** (might need to expand a menu)
2. Click **"Credentials"**

**What you'll see:**
- A list of credentials (might be empty or have existing entries)
- Tabs at the top: "API keys", "OAuth consent screen", "Credentials"
- Make sure you're on the "Credentials" tab

---

### Step 4: Find Your OAuth 2.0 Client ID
**Look for:**
- Entry with type: **"OAuth 2.0 Client ID"**
- Application type: **"Web application"** 
- Client ID shows: `your-client-id.apps.googleusercontent.com`

**Action:** Click on this entry to open its details

---

### Step 5: Locate Authorized Redirect URIs
**In the opened details, look for:**
- Section titled: **"Authorized redirect URIs"** or **"Redirect URIs"**
- Currently might be empty or have other values

**Example of what it looks like:**
```
Authorized redirect URIs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ http://localhost:3000/callback ]  ✕
[ http://example.com/auth/callback ]  ✕

[+ ADD URI]  [SAVE]
```

---

### Step 6: Add New URI
**Action Steps:**
1. Click **[+ ADD URI]** button
2. An empty text field appears
3. Type or paste: `http://localhost:4000/callback`
4. Click outside the field (it usually auto-confirms)

**After adding, you should see:**
```
Authorized redirect URIs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ http://localhost:3000/callback ]  ✕
[ http://localhost:4000/callback ]  ✕
[ http://example.com/auth/callback ]  ✕

[+ ADD URI]  [SAVE]
```

---

### Step 7: Save Changes
**Action:** Click the **[SAVE]** button at the bottom

**You should see:**
- Button changes briefly
- Confirmation message appears (usually: "Settings updated successfully" or similar)
- Changes are saved

---

### Step 8: Verify
**The list now shows:**
```
Authorized redirect URIs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ http://localhost:3000/callback
✓ http://localhost:4000/callback    ← NEW
✓ http://example.com/auth/callback
```

All your redirect URIs are now registered!

---

## Key Points to Remember

⚠️ **EXACT MATCH REQUIRED:**
- Your code expects: `http://localhost:4000/callback`
- Google must have: `http://localhost:4000/callback`
- They must match EXACTLY (no extra spaces, slashes, etc.)

✅ **CORRECT:**
- ✓ `http://localhost:4000/callback`
- ✓ `https://yourdomain.com/auth/callback`

❌ **INCORRECT:**
- ✗ `http://localhost:4000/` (missing `/callback`)
- ✗ `http://localhost:4000/callback/` (extra slash)
- ✗ `http://localhost:3000/callback` (wrong port)
- ✗ `https://localhost:4000/callback` (https instead of http for localhost)

---

## After Adding the URI

**Wait:** 30 seconds for Google to update

**Clear Cache:** 
- Press `Ctrl+Shift+Del` (Windows) or `Cmd+Shift+Del` (Mac)
- Select "All time"
- Click "Clear data"

**Restart Servers:**
```powershell
# Stop all Node processes
Get-Process node | Stop-Process -Force

# Start backend
cd backend
npm start

# In new terminal, start frontend
cd frontend  
npm start
```

**Test OAuth:**
1. Go to: `http://localhost:5173`
2. Click: "Sign in with Google"
3. Complete authorization in popup
4. ✅ Should work now!

---

## Troubleshooting: If it still shows redirect_uri_mismatch

**1. Check you added the URI correctly:**
- Go back to Google Cloud Console
- Verify the exact text: `http://localhost:4000/callback`
- No typos, no extra spaces

**2. Check backend configuration:**
```powershell
cd backend
cat .env | findstr "GOOGLE_REDIRECT_URI"
```
Should show:
```
GOOGLE_REDIRECT_URI=http://localhost:4000/callback
```

**3. Check backend console output when trying OAuth:**
Look for this in backend logs:
```
🔐 [OAuth] Generating auth URL
   Client ID: ✓ Loaded
   Client Secret: ✓ Loaded
   Redirect URI: http://localhost:4000/callback
✅ [OAuth] Auth URL generated successfully
```

If redirect URI shows something different, restart backend after verifying .env file.

**4. Last resort:**
- Fully close your browser
- Clear all cache and cookies
- Restart both backend and frontend servers
- Open fresh browser window
- Try OAuth again

---

## Questions?

**What's a redirect URI?**
It's the address where Google sends users after they authorize. It must match exactly in:
1. Your code (backend/src/routes/googleAuth.js)
2. Your .env file (backend/.env)
3. Your Google Cloud Console credentials

**Why must it be localhost:4000?**
Because your backend server runs on port 4000 and listens for OAuth callbacks at `/callback`.

**Why exact match?**
Google's OAuth system is strict about security. Even a small difference (like missing `/callback`) will be rejected.

**Can I test with a different port?**
Yes, but you'd need to:
1. Change GOOGLE_REDIRECT_URI in .env
2. Add the new URI to Google Cloud Console
3. Restart backend
4. Try OAuth again

For now, stick with port 4000 to match the current configuration.

---

**Once this is set up, OAuth will work and your app can:**
- ✅ Sign users in with Google
- ✅ Get Google Fit access token
- ✅ Fetch user's fitness data
- ✅ Connect mood tracking to health metrics
- ✅ Show personalized wellness insights
