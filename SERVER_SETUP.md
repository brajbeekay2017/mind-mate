# Mind Mate Server Setup Guide
# For Server Admin (azureadmin)

## Server Information
- **Frontend URL**: https://mindmate.aapnainfotech.in
- **Backend URL**: https://mindmateapi.aapnainfotech.in
- **Server Paths**:
  - Web Root: `C:\inetpub\Mindmate\Web`
  - Backend: `C:\inetpub\Mindmate\Web\backend`
  - Frontend: `C:\inetpub\Mindmate\Web\frontend`

---

## Prerequisites (Already Installed ✓)
- ✓ IIS
- ✓ Node.js
- ✓ PM2

---

## Step-by-Step Deployment

### 1. Download Code to Server
```powershell
# Clone repository to server
cd C:\Users\azureadmin\Desktop
git clone https://github.com/brajbeekay2017/mind-mate.git
cd mind-mate
git checkout mind-mate-final-V2.0
```

### 2. Run Diagnostic (Check Current State)
```powershell
# Run as Administrator
cd C:\Users\azureadmin\Desktop\mind-mate
.\diagnose-server.ps1
```

**Read the output** - it shows what's missing or misconfigured.

### 3. Run Automated Deployment
```powershell
# Run as Administrator
cd C:\Users\azureadmin\Desktop\mind-mate
.\deploy-to-server.ps1
```

This script will automatically:
- ✅ Copy files to `C:\inetpub\Mindmate\Web\`
- ✅ Install Node.js dependencies
- ✅ Build frontend for production
- ✅ Start backend with PM2
- ✅ Configure IIS site
- ✅ Set permissions
- ✅ Restart IIS

### 4. Verify Installation
```powershell
# Check backend is running
pm2 status

# Test backend health
Invoke-RestMethod http://localhost:4000/health

# Open website in browser
Start-Process https://mindmate.aapnainfotech.in
```

---

## Manual Steps (If Automation Fails)

### Backend Setup
```powershell
# Install dependencies
cd C:\inetpub\Mindmate\Web\backend
npm install

# Start with PM2
pm2 start src\server.js --name mindmate-backend
pm2 save
pm2 startup  # Follow the instructions

# Test
Invoke-RestMethod http://localhost:4000/health
```

### Frontend Setup
```powershell
# Install and build
cd C:\inetpub\Mindmate\Web\frontend
npm install
npm run build

# Verify build
Get-ChildItem dist\assets
# Should see .js and .css files
```

### IIS Configuration
```powershell
# Import IIS module
Import-Module WebAdministration

# Create app pool
New-WebAppPool -Name "MindMatePool"
Set-ItemProperty -Path "IIS:\AppPools\MindMatePool" -Name "managedRuntimeVersion" -Value ""

# Create website
New-Website -Name "MindMate" `
  -Port 80 `
  -HostHeader "mindmate.aapnainfotech.in" `
  -PhysicalPath "C:\inetpub\Mindmate\Web" `
  -ApplicationPool "MindMatePool"

# Copy web.config
Copy-Item C:\Users\azureadmin\Desktop\mind-mate\web.config C:\inetpub\Mindmate\Web\ -Force

# Restart IIS
iisreset
```

---

## Troubleshooting

### Issue: "Unexpected token '<'" in browser

**Cause**: Frontend build not deployed or IIS serving wrong files

**Fix**:
```powershell
# 1. Rebuild frontend
cd C:\inetpub\Mindmate\Web\frontend
npm run build

# 2. Check build exists
Get-ChildItem dist\assets\*.js

# 3. Verify web.config
Test-Path C:\inetpub\Mindmate\Web\web.config

# 4. Restart IIS
iisreset

# 5. Clear browser cache (Ctrl+Shift+Delete)
```

### Issue: Backend not responding

**Fix**:
```powershell
# Check PM2 status
pm2 status

# Restart backend
pm2 restart mindmate-backend

# View logs
pm2 logs mindmate-backend

# Manual test
cd C:\inetpub\Mindmate\Web\backend
node src\server.js
# Check for errors
```

### Issue: Google OAuth not working

**Fix**: Update Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select OAuth 2.0 Client ID
3. Add **Authorized redirect URIs**:
   ```
   https://mindmateapi.aapnainfotech.in/google-auth/callback
   ```
4. Add **Authorized JavaScript origins**:
   ```
   https://mindmate.aapnainfotech.in
   https://mindmateapi.aapnainfotech.in
   ```

---

## File Locations Reference

```
C:\inetpub\Mindmate\Web\
├── web.config                    # IIS configuration (CRITICAL)
├── privacy.html                  # Privacy policy page
├── backend\
│   ├── .env                     # Backend config (API keys, URLs)
│   ├── src\server.js            # Backend entry point
│   └── node_modules\            # Dependencies
└── frontend\
    ├── dist\                    # Production build (SERVE THIS)
    │   ├── index.html
    │   └── assets\
    │       ├── index-xxx.js
    │       └── index-xxx.css
    ├── src\                     # Source code (DON'T SERVE)
    └── node_modules\            # Dependencies
```

---

## Important Commands

```powershell
# Check what's running on port 4000
netstat -ano | findstr :4000

# Kill process on port 4000 (if needed)
Stop-Process -Id <PID> -Force

# Restart everything
pm2 restart mindmate-backend
iisreset

# View PM2 logs
pm2 logs mindmate-backend --lines 100

# Monitor PM2
pm2 monit

# Check IIS sites
Get-Website | Format-Table Name, PhysicalPath, State

# Test backend directly
Invoke-RestMethod http://localhost:4000/health
```

---

## Quick Health Check

Run this to verify everything is working:

```powershell
Write-Host "=== Quick Health Check ===" -ForegroundColor Cyan

# 1. Backend
try {
    $health = Invoke-RestMethod http://localhost:4000/health
    Write-Host "✓ Backend: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend not running" -ForegroundColor Red
}

# 2. Frontend Build
if (Test-Path "C:\inetpub\Mindmate\Web\frontend\dist\index.html") {
    Write-Host "✓ Frontend build exists" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend build missing" -ForegroundColor Red
}

# 3. Web.config
if (Test-Path "C:\inetpub\Mindmate\Web\web.config") {
    Write-Host "✓ web.config exists" -ForegroundColor Green
} else {
    Write-Host "✗ web.config missing" -ForegroundColor Red
}

# 4. PM2
pm2 status

Write-Host "`nIf all checks pass, visit: https://mindmate.aapnainfotech.in" -ForegroundColor Yellow
```

---

## Contact
If you encounter issues:
- **Developer**: amiteshsingh.smsit@gmail.com
- **GitHub**: https://github.com/brajbeekay2017/mind-mate/tree/mind-mate-final-V2.0
