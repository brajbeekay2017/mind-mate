# Complete CORS Fix Script for Production Server
# Run this on production server as Administrator

Write-Host "=== Mind Mate CORS Fix ===" -ForegroundColor Cyan

# Step 1: Stop everything
Write-Host "`n1. Stopping all services..." -ForegroundColor Yellow
pm2 stop all
Stop-Website -Name "Mindmate" -ErrorAction SilentlyContinue
Stop-Website -Name "MindmateAPI" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Step 2: Delete all web.config files
Write-Host "`n2. Removing old web.config files..." -ForegroundColor Yellow
Remove-Item "C:\inetpub\Mindmate\Web\frontend\web.config" -Force -ErrorAction SilentlyContinue
Remove-Item "C:\inetpub\Mindmate\Web\backend\web.config" -Force -ErrorAction SilentlyContinue
Write-Host "   Deleted old configs" -ForegroundColor Green

# Step 3: Reset IIS
Write-Host "`n3. Resetting IIS..." -ForegroundColor Yellow
iisreset /stop
Start-Sleep -Seconds 2
iisreset /start
Write-Host "   IIS reset complete" -ForegroundColor Green

# Step 4: Pull latest code
Write-Host "`n4. Pulling latest code..." -ForegroundColor Yellow
cd C:\Users\azureadmin\Desktop\mind-mate
git fetch --all
git reset --hard origin/main
Write-Host "   Code updated to latest" -ForegroundColor Green

# Step 5: Run deployment
Write-Host "`n5. Running deployment..." -ForegroundColor Yellow
.\DEPLOY.ps1

# Step 6: Verify web.config files
Write-Host "`n6. Verifying web.config files..." -ForegroundColor Yellow
$backendConfig = Get-Content "C:\inetpub\Mindmate\Web\backend\web.config" -Raw
if ($backendConfig -match "Access-Control") {
    Write-Host "   WARNING: Backend web.config still has CORS headers!" -ForegroundColor Red
} else {
    Write-Host "   Backend web.config: Clean (no CORS)" -ForegroundColor Green
}

$frontendConfig = Get-Content "C:\inetpub\Mindmate\Web\frontend\web.config" -Raw
if ($frontendConfig -match "Access-Control") {
    Write-Host "   WARNING: Frontend web.config still has CORS headers!" -ForegroundColor Red
} else {
    Write-Host "   Frontend web.config: Clean (no CORS)" -ForegroundColor Green
}

# Step 7: Check backend server.js
Write-Host "`n7. Verifying backend CORS configuration..." -ForegroundColor Yellow
$serverJs = Get-Content "C:\inetpub\Mindmate\Web\backend\src\server.js" -Raw
if ($serverJs -match "corsOptions") {
    Write-Host "   Backend has explicit CORS config" -ForegroundColor Green
} else {
    Write-Host "   WARNING: Backend missing explicit CORS config!" -ForegroundColor Red
}

# Step 8: Start backend
Write-Host "`n8. Starting backend..." -ForegroundColor Yellow
cd C:\inetpub\Mindmate\Web\backend
pm2 delete mindmate-backend -ErrorAction SilentlyContinue
pm2 start src/server.js --name mindmate-backend
pm2 save
Write-Host "   Backend started" -ForegroundColor Green

# Step 9: Test backend directly
Write-Host "`n9. Testing backend directly..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -Method GET -UseBasicParsing
    $corsHeader = $response.Headers['Access-Control-Allow-Origin']
    Write-Host "   Health check: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   CORS Header count: $(($corsHeader -split ',').Count)" -ForegroundColor $(if (($corsHeader -split ',').Count -eq 1) { 'Green' } else { 'Red' })
    Write-Host "   CORS Header value: $corsHeader" -ForegroundColor Gray
} catch {
    Write-Host "   ERROR: Cannot reach backend at localhost:4000" -ForegroundColor Red
}

# Step 10: Start IIS sites
Write-Host "`n10. Starting IIS sites..." -ForegroundColor Yellow
Start-Website -Name "Mindmate"
Start-Website -Name "MindmateAPI"
Write-Host "   Sites started" -ForegroundColor Green

Write-Host "`n=== CORS Fix Complete ===" -ForegroundColor Cyan
Write-Host "Now test: https://mindmate.aapnainfotech.in" -ForegroundColor Yellow
