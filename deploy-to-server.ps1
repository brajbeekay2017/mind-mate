# Mind Mate IIS Deployment Script
# Run this on your production server as Administrator

Write-Host "=== Mind Mate Deployment Script ===" -ForegroundColor Cyan

# Configuration
$webRoot = "C:\inetpub\Mindmate\Web"
$backendPath = "$webRoot\backend"
$frontendPath = "$webRoot\frontend"
$sourcePath = "C:\Users\aksingh\Desktop\mind-mate"  # Update this with your actual source path

Write-Host "`nStep 1: Creating directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $webRoot -Force | Out-Null
New-Item -ItemType Directory -Path $backendPath -Force | Out-Null
New-Item -ItemType Directory -Path $frontendPath -Force | Out-Null
Write-Host "✓ Directories created" -ForegroundColor Green

Write-Host "`nStep 2: Copying backend files..." -ForegroundColor Yellow
if (Test-Path "$sourcePath\backend") {
    Copy-Item -Path "$sourcePath\backend\*" -Destination $backendPath -Recurse -Force
    Write-Host "✓ Backend files copied" -ForegroundColor Green
} else {
    Write-Host "✗ Backend source not found at $sourcePath\backend" -ForegroundColor Red
    exit
}

Write-Host "`nStep 3: Copying frontend files..." -ForegroundColor Yellow
if (Test-Path "$sourcePath\frontend") {
    Copy-Item -Path "$sourcePath\frontend\*" -Destination $frontendPath -Recurse -Force
    Write-Host "✓ Frontend files copied" -ForegroundColor Green
} else {
    Write-Host "✗ Frontend source not found at $sourcePath\frontend" -ForegroundColor Red
    exit
}

Write-Host "`nStep 4: Copying web.config and privacy.html..." -ForegroundColor Yellow
if (Test-Path "$sourcePath\web.config") {
    Copy-Item -Path "$sourcePath\web.config" -Destination $webRoot -Force
    Write-Host "✓ web.config copied" -ForegroundColor Green
} else {
    Write-Host "⚠ web.config not found - you'll need to create it" -ForegroundColor Yellow
}

if (Test-Path "$sourcePath\privacy.html") {
    Copy-Item -Path "$sourcePath\privacy.html" -Destination $webRoot -Force
    Write-Host "✓ privacy.html copied" -ForegroundColor Green
}

Write-Host "`nStep 5: Installing backend dependencies..." -ForegroundColor Yellow
Push-Location $backendPath
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Backend npm install failed" -ForegroundColor Red
}
Pop-Location

Write-Host "`nStep 6: Building frontend..." -ForegroundColor Yellow
Push-Location $frontendPath
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Frontend built successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Frontend build failed" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Frontend npm install failed" -ForegroundColor Red
}
Pop-Location

Write-Host "`nStep 7: Starting backend with PM2..." -ForegroundColor Yellow
Push-Location $backendPath
pm2 delete mindmate-backend 2>$null  # Delete if exists
pm2 start src\server.js --name mindmate-backend
pm2 save
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Backend started with PM2" -ForegroundColor Green
} else {
    Write-Host "✗ PM2 start failed" -ForegroundColor Red
}
Pop-Location

Write-Host "`nStep 8: Setting up IIS..." -ForegroundColor Yellow
Import-Module WebAdministration

# Check if site exists
$siteName = "MindMate"
if (Get-Website -Name $siteName -ErrorAction SilentlyContinue) {
    Write-Host "⚠ Site '$siteName' already exists - updating..." -ForegroundColor Yellow
    Set-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath -Value $webRoot
} else {
    # Create application pool
    if (-not (Test-Path "IIS:\AppPools\MindMatePool")) {
        New-WebAppPool -Name "MindMatePool"
        Set-ItemProperty -Path "IIS:\AppPools\MindMatePool" -Name "managedRuntimeVersion" -Value ""
    }
    
    # Create website
    New-Website -Name $siteName -Port 80 -HostHeader "mindmate.aapnainfotech.in" -PhysicalPath $webRoot -ApplicationPool "MindMatePool"
    Write-Host "✓ IIS site created" -ForegroundColor Green
}

Write-Host "`nStep 9: Setting permissions..." -ForegroundColor Yellow
$acl = Get-Acl $webRoot
$permission = "IIS_IUSRS","FullControl","ContainerInherit,ObjectInherit","None","Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl $webRoot $acl
Write-Host "✓ Permissions set" -ForegroundColor Green

Write-Host "`nStep 10: Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce
Write-Host "✓ IIS restarted" -ForegroundColor Green

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "`nVerifying installation..." -ForegroundColor Yellow

# Verify
Write-Host "`nBackend status:" -ForegroundColor Cyan
pm2 status

Write-Host "`nTesting backend health:" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod http://localhost:4000/health -ErrorAction Stop
    Write-Host "✓ Backend health check passed: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend health check failed" -ForegroundColor Red
}

Write-Host "`nFrontend build check:" -ForegroundColor Cyan
if (Test-Path "$frontendPath\dist\index.html") {
    Write-Host "✓ Frontend build exists" -ForegroundColor Green
    Get-ChildItem "$frontendPath\dist" | Select-Object -First 5 | Format-Table Name
} else {
    Write-Host "✗ Frontend build missing" -ForegroundColor Red
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Update Google Cloud Console with: https://mindmate.aapnainfotech.in" -ForegroundColor White
Write-Host "2. Test the site: https://mindmate.aapnainfotech.in" -ForegroundColor White
Write-Host "3. Check browser console (F12) for any errors" -ForegroundColor White
