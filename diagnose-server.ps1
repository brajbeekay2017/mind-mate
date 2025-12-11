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
        Write-Host "✓ $folder exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $folder MISSING" -ForegroundColor Red
    }
}

# 2. Check web.config
Write-Host "`n2. Checking web.config..." -ForegroundColor Yellow
if (Test-Path "$webRoot\web.config") {
    Write-Host "✓ web.config exists" -ForegroundColor Green
} else {
    Write-Host "✗ web.config MISSING - this is critical!" -ForegroundColor Red
}

# 3. Check frontend build
Write-Host "`n3. Checking frontend build..." -ForegroundColor Yellow
if (Test-Path "$frontendPath\dist\index.html") {
    Write-Host "✓ index.html exists" -ForegroundColor Green
    
    # List assets
    if (Test-Path "$frontendPath\dist\assets") {
        $jsFiles = Get-ChildItem "$frontendPath\dist\assets\*.js" | Measure-Object
        $cssFiles = Get-ChildItem "$frontendPath\dist\assets\*.css" | Measure-Object
        Write-Host "  - Found $($jsFiles.Count) JS files" -ForegroundColor Cyan
        Write-Host "  - Found $($cssFiles.Count) CSS files" -ForegroundColor Cyan
        
        if ($jsFiles.Count -eq 0) {
            Write-Host "✗ No JS files found - build is incomplete!" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ assets folder MISSING" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Frontend build MISSING - run 'npm run build'" -ForegroundColor Red
}

# 4. Check backend .env
Write-Host "`n4. Checking backend configuration..." -ForegroundColor Yellow
if (Test-Path "$backendPath\.env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    $envContent = Get-Content "$backendPath\.env" | Select-String -Pattern "GOOGLE_REDIRECT_URI|FRONTEND_URL|NODE_ENV"
    $envContent | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
} else {
    Write-Host "✗ .env file MISSING" -ForegroundColor Red
}

# 5. Check PM2
Write-Host "`n5. Checking PM2 backend status..." -ForegroundColor Yellow
pm2 status

# 6. Test backend
Write-Host "`n6. Testing backend..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod http://localhost:4000/health -ErrorAction Stop
    Write-Host "✓ Backend responding" -ForegroundColor Green
    Write-Host "  Status: $($health.status)" -ForegroundColor Cyan
    Write-Host "  LLM Provider: $($health.llmProvider)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Backend NOT responding on port 4000" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
}

# 7. Check IIS
Write-Host "`n7. Checking IIS configuration..." -ForegroundColor Yellow
Import-Module WebAdministration
$site = Get-Website | Where-Object {$_.PhysicalPath -like "*Mindmate*"}
if ($site) {
    Write-Host "✓ IIS site found: $($site.Name)" -ForegroundColor Green
    Write-Host "  Physical Path: $($site.PhysicalPath)" -ForegroundColor Cyan
    Write-Host "  Bindings: $($site.bindings.Collection.bindingInformation)" -ForegroundColor Cyan
    Write-Host "  State: $($site.State)" -ForegroundColor Cyan
    
    if ($site.PhysicalPath -ne $webRoot) {
        Write-Host "⚠ WARNING: Physical path doesn't match $webRoot" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ No IIS site found for Mindmate" -ForegroundColor Red
}

# 8. Check URL Rewrite
Write-Host "`n8. Checking URL Rewrite module..." -ForegroundColor Yellow
$rewriteModule = Get-WindowsFeature -Name Web-Http-Redirect -ErrorAction SilentlyContinue
if ($rewriteModule -and $rewriteModule.Installed) {
    Write-Host "✓ URL Rewrite installed" -ForegroundColor Green
} else {
    Write-Host "⚠ URL Rewrite may not be installed" -ForegroundColor Yellow
}

# 9. Check ports
Write-Host "`n9. Checking port usage..." -ForegroundColor Yellow
$port4000 = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
if ($port4000) {
    Write-Host "✓ Port 4000 in use (backend running)" -ForegroundColor Green
} else {
    Write-Host "✗ Port 4000 not in use (backend not running)" -ForegroundColor Red
}

# 10. Summary
Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "`nIf you see errors above, here's what to do:" -ForegroundColor Yellow
Write-Host "  ✗ Missing web.config → Copy from source or create it" -ForegroundColor White
Write-Host "  ✗ Missing frontend build → Run: cd $frontendPath; npm run build" -ForegroundColor White
Write-Host "  ✗ Backend not responding → Run: cd $backendPath; pm2 restart mindmate-backend" -ForegroundColor White
Write-Host "  ✗ IIS site wrong path → Update site physical path to: $webRoot" -ForegroundColor White

Write-Host "`n=== End Diagnostic ===" -ForegroundColor Cyan
