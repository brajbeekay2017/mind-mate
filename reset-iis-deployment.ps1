# Reset IIS Deployment for Mind Mate
# Run this on the production server as Administrator

Write-Host "=== Mind Mate IIS Reset Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop and remove existing IIS sites
Write-Host "Step 1: Removing existing IIS sites..." -ForegroundColor Yellow
Import-Module WebAdministration

$sites = @('MindMateFrontend', 'MindMateAPI')
foreach ($siteName in $sites) {
    if (Get-Website -Name $siteName -ErrorAction SilentlyContinue) {
        Stop-Website -Name $siteName -ErrorAction SilentlyContinue
        Remove-Website -Name $siteName -ErrorAction SilentlyContinue
        Write-Host "  ✓ Removed $siteName" -ForegroundColor Green
    } else {
        Write-Host "  - $siteName doesn't exist" -ForegroundColor Gray
    }
}

# Step 2: Stop backend PM2 process
Write-Host ""
Write-Host "Step 2: Stopping backend PM2 process..." -ForegroundColor Yellow
pm2 stop mindmate-backend -ErrorAction SilentlyContinue
pm2 delete mindmate-backend -ErrorAction SilentlyContinue
Write-Host "  ✓ PM2 process stopped" -ForegroundColor Green

# Step 3: Clean deployment directory
Write-Host ""
Write-Host "Step 3: Cleaning deployment directory..." -ForegroundColor Yellow
$deployPath = "C:\inetpub\Mindmate\Web"
if (Test-Path $deployPath) {
    Remove-Item -Path "$deployPath\*" -Recurse -Force
    Write-Host "  ✓ Cleaned $deployPath" -ForegroundColor Green
} else {
    New-Item -Path $deployPath -ItemType Directory -Force | Out-Null
    Write-Host "  ✓ Created $deployPath" -ForegroundColor Green
}

# Step 4: Restart IIS
Write-Host ""
Write-Host "Step 4: Restarting IIS..." -ForegroundColor Yellow
iisreset
Write-Host "  ✓ IIS restarted" -ForegroundColor Green

Write-Host ""
Write-Host "=== Reset Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Pull latest code from GitHub"
Write-Host "2. Run deploy-to-server.ps1 to redeploy"
Write-Host ""
