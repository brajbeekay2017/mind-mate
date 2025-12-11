# Mind Mate Production Deployment Script
# Run this on your LOCAL machine to deploy to production server

Write-Host "=== Mind Mate Production Deployment ===" -ForegroundColor Cyan

# Configuration
$serverUser = "azureadmin"
$serverHost = "mindmate.aapnainfotech.in"  # Or use IP address
$serverPath = "C:\inetpub\Mindmate\Web"
$localPath = $PSScriptRoot

Write-Host "`nStep 1: Building frontend for production..." -ForegroundColor Yellow
Push-Location "$localPath\frontend"
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED Frontend npm install failed" -ForegroundColor Red
        exit 1
    }
    
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED Frontend build failed" -ForegroundColor Red
        exit 1
    }
    
    if (Test-Path "dist\index.html") {
        Write-Host "  OK Frontend built successfully" -ForegroundColor Green
    } else {
        Write-Host "  FAILED Build output not found" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host "`nStep 2: Committing changes to Git..." -ForegroundColor Yellow
git add .
$commitMsg = "deploy: production build $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git commit -m $commitMsg
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Changes committed" -ForegroundColor Green
} else {
    Write-Host "  WARNING No changes to commit" -ForegroundColor Yellow
}

Write-Host "`nStep 3: Pushing to GitHub..." -ForegroundColor Yellow
git push origin mind-mate-final-V2.0
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Pushed to GitHub" -ForegroundColor Green
} else {
    Write-Host "  FAILED Git push failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Next: Run on Production Server ===" -ForegroundColor Cyan
Write-Host "`nOn the production server, run:" -ForegroundColor Yellow
Write-Host "  cd C:\Users\$serverUser\Desktop\mind-mate" -ForegroundColor White
Write-Host "  git pull origin mind-mate-final-V2.0" -ForegroundColor White
Write-Host "  .\deploy-to-server.ps1" -ForegroundColor White

Write-Host "`nOr copy this complete command for the server admin:" -ForegroundColor Yellow
Write-Host @"

cd C:\Users\$serverUser\Desktop\mind-mate
git pull origin mind-mate-final-V2.0
.\deploy-to-server.ps1

"@ -ForegroundColor Cyan

Write-Host "`n=== Local Deployment Complete ===" -ForegroundColor Green
Write-Host "Code is ready on GitHub. Server admin should pull and deploy." -ForegroundColor White
