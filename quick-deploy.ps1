# Quick Code Deployment - Updates code only, preserves configs
# Run on production server as Administrator

Write-Host "=== Mind Mate Quick Deployment ===" -ForegroundColor Cyan
Write-Host "This will update code WITHOUT touching web.config or .env files" -ForegroundColor Yellow
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Pull latest code
Write-Host "Step 1: Pulling latest code..." -ForegroundColor Yellow
cd C:\Users\azureadmin\Desktop\mind-mate
git fetch origin
git pull origin main
Write-Host "  [OK] Code updated" -ForegroundColor Green

# Step 2: Build frontend
Write-Host ""
Write-Host "Step 2: Building frontend..." -ForegroundColor Yellow
cd C:\Users\azureadmin\Desktop\mind-mate\frontend
npm install --legacy-peer-deps
npm run build
Write-Host "  [OK] Frontend built" -ForegroundColor Green

# Step 3: Deploy frontend (skip web.config)
Write-Host ""
Write-Host "Step 3: Deploying frontend files..." -ForegroundColor Yellow
$frontendDest = "C:\inetpub\Mindmate\Web\frontend"

# Copy built files but exclude web.config
Get-ChildItem -Path "dist" -Recurse | ForEach-Object {
    $targetPath = $_.FullName.Replace((Resolve-Path "dist").Path, $frontendDest)
    if ($_.Name -ne "web.config") {
        if ($_.PSIsContainer) {
            New-Item -ItemType Directory -Path $targetPath -Force -ErrorAction SilentlyContinue | Out-Null
        } else {
            Copy-Item -Path $_.FullName -Destination $targetPath -Force
        }
    }
}
Write-Host "  [OK] Frontend deployed (web.config preserved)" -ForegroundColor Green

# Step 4: Deploy backend (skip .env and web.config)
Write-Host ""
Write-Host "Step 4: Deploying backend files..." -ForegroundColor Yellow
$backendDest = "C:\inetpub\Mindmate\Web\backend"
$backendSrc = "C:\Users\azureadmin\Desktop\mind-mate\backend"

# Copy backend files excluding .env, web.config, node_modules, and data.json
$excludeFiles = @(
    "web.config", 
    ".env", 
    ".env.local",
    ".env.development",
    ".env.production",
    "data.json",
    ".gitignore",
    ".git",
    "package-lock.json",
    "README.md",
    "DEPLOY.ps1",
    "quick-deploy.ps1",
    "fix-cors-production.ps1",
    "test-smoke.ps1",
    "test-smoke-advanced.ps1",
    "test-smoke-final.ps1"
)
$excludeFolders = @("node_modules", ".git", "test")

Get-ChildItem -Path $backendSrc -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($backendSrc.Length + 1)
    $targetPath = Join-Path $backendDest $relativePath
    
    # Skip excluded folders
    $skipFolder = $false
    foreach ($folder in $excludeFolders) {
        if ($relativePath -like "$folder*") {
            $skipFolder = $true
            break
        }
    }
    
    if (-not $skipFolder -and $_.Name -notin $excludeFiles) {
        if ($_.PSIsContainer) {
            New-Item -ItemType Directory -Path $targetPath -Force -ErrorAction SilentlyContinue | Out-Null
        } else {
            Copy-Item -Path $_.FullName -Destination $targetPath -Force
        }
    }
}
Write-Host "  [OK] Backend deployed (.env, web.config, data.json preserved)" -ForegroundColor Green

# Step 5: Install backend dependencies if package.json changed
Write-Host ""
Write-Host "Step 5: Checking backend dependencies..." -ForegroundColor Yellow
cd $backendDest

# Only install if package.json exists and has changed
if (Test-Path "package.json") {
    npm install --production --no-save
} else {
    Write-Host "  [WARN] package.json not found, skipping npm install" -ForegroundColor Yellow
}
Write-Host "  [OK] Dependencies checked" -ForegroundColor Green

# Step 6: Restart backend
Write-Host ""
Write-Host "Step 6: Restarting backend..." -ForegroundColor Yellow
pm2 restart mindmate-backend
Start-Sleep -Seconds 2
pm2 status mindmate-backend
Write-Host "  [OK] Backend restarted" -ForegroundColor Green

# Step 7: Restart IIS
Write-Host ""
Write-Host "Step 7: Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce
Write-Host "  [OK] IIS restarted" -ForegroundColor Green

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host "[OK] Code updated" -ForegroundColor Green
Write-Host "[OK] Configurations preserved (.env, web.config, data.json)" -ForegroundColor Green
Write-Host ""
Write-Host "Test at: https://mindmate.aapnainfotech.in" -ForegroundColor Cyan
