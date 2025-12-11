# Mind Mate Server Diagnostic Script
# Run this on your production server (as azureadmin) to troubleshoot issues

Write-Host "=== Mind Mate Server Diagnostic ===" -ForegroundColor Cyan

$webRoot = "C:\inetpub\Mindmate\Web"
$backendPath = "$webRoot\backend"
$frontendPath = "$webRoot\frontend"

# 1. Check folder structure
Write-Host "`n1. Checking folder structure..." -ForegroundColor Yellow
$folders = @(
    $webRoot,
    $backendPath,
    $frontendPath,
    "$frontendPath\dist"
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "  OK $folder exists" -ForegroundColor Green
    } else {
        Write-Host "  MISSING $folder" -ForegroundColor Red
    }
}

# 2. Check web.config
Write-Host "`n2. Checking web.config..." -ForegroundColor Yellow
if (Test-Path "$webRoot\web.config") {
    Write-Host "  OK web.config exists" -ForegroundColor Green
} else {
    Write-Host "  MISSING web.config - this is critical!" -ForegroundColor Red
}

# 3. Check frontend build
Write-Host "`n3. Checking frontend build..." -ForegroundColor Yellow
if (Test-Path "$frontendPath\dist\index.html") {
    Write-Host "  OK index.html exists" -ForegroundColor Green
    
    if (Test-Path "$frontendPath\dist\assets") {
        $jsFiles = Get-ChildItem "$frontendPath\dist\assets\*.js" -ErrorAction SilentlyContinue
        $cssFiles = Get-ChildItem "$frontendPath\dist\assets\*.css" -ErrorAction SilentlyContinue
        Write-Host "  - Found $($jsFiles.Count) JS files" -ForegroundColor Cyan
        Write-Host "  - Found $($cssFiles.Count) CSS files" -ForegroundColor Cyan
        
        if ($jsFiles.Count -eq 0) {
            Write-Host "  MISSING No JS files found - build is incomplete!" -ForegroundColor Red
        }
    } else {
        Write-Host "  MISSING assets folder" -ForegroundColor Red
    }
} else {
    Write-Host "  MISSING Frontend build - run 'npm run build'" -ForegroundColor Red
}

# 4. Check backend .env
Write-Host "`n4. Checking backend configuration..." -ForegroundColor Yellow
if (Test-Path "$backendPath\.env") {
    Write-Host "  OK .env file exists" -ForegroundColor Green
    $envContent = Get-Content "$backendPath\.env" -ErrorAction SilentlyContinue | Select-String -Pattern "GOOGLE_REDIRECT_URI|FRONTEND_URL|NODE_ENV"
    if ($envContent) {
        $envContent | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
    }
} else {
    Write-Host "  MISSING .env file" -ForegroundColor Red
}

# 5. Check PM2
Write-Host "`n5. Checking PM2 backend status..." -ForegroundColor Yellow
pm2 status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING PM2 not available or no processes running" -ForegroundColor Yellow
}

# 6. Test backend
Write-Host "`n6. Testing backend..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod http://localhost:4000/health -ErrorAction Stop -TimeoutSec 5
    Write-Host "  OK Backend responding" -ForegroundColor Green
    Write-Host "  Status: $($health.status)" -ForegroundColor Cyan
    if ($health.llmProvider) {
        Write-Host "  LLM Provider: $($health.llmProvider)" -ForegroundColor Cyan
    }
}
catch {
    Write-Host "  FAILED Backend NOT responding on port 4000" -ForegroundColor Red
}

# 7. Check IIS
Write-Host "`n7. Checking IIS configuration..." -ForegroundColor Yellow
try {
    Import-Module WebAdministration -ErrorAction Stop
    $site = Get-Website | Where-Object {$_.PhysicalPath -like "*Mindmate*"}
    if ($site) {
        Write-Host "  OK IIS site found: $($site.Name)" -ForegroundColor Green
        Write-Host "    Physical Path: $($site.PhysicalPath)" -ForegroundColor Cyan
        Write-Host "    State: $($site.State)" -ForegroundColor Cyan
    } else {
        Write-Host "  MISSING No IIS site found for Mindmate" -ForegroundColor Red
    }
}
catch {
    Write-Host "  WARNING Cannot check IIS - WebAdministration module not available" -ForegroundColor Yellow
}

# 8. Check ports
Write-Host "`n8. Checking port usage..." -ForegroundColor Yellow
$port4000 = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue 2>$null
if ($port4000) {
    Write-Host "  OK Port 4000 in use (backend running)" -ForegroundColor Green
} else {
    Write-Host "  FAILED Port 4000 not in use (backend not running)" -ForegroundColor Red
}

# 9. Summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "`nIf you see MISSING or FAILED above:" -ForegroundColor Yellow
Write-Host "  1. Run deploy-to-server.ps1 to fix automatically" -ForegroundColor White
Write-Host "  2. Or manually:" -ForegroundColor White
Write-Host "     - Missing web.config: Copy from source code" -ForegroundColor White
Write-Host "     - Missing frontend build: cd $frontendPath; npm run build" -ForegroundColor White
Write-Host "     - Backend not responding: cd $backendPath; pm2 start src\server.js --name mindmate-backend" -ForegroundColor White

Write-Host "`n=== End Diagnostic ===" -ForegroundColor Cyan
