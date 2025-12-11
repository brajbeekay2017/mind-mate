# Mind Mate IIS Deployment Script
# Run this on your production server as Administrator

Write-Host "=== Mind Mate Deployment Script ===" -ForegroundColor Cyan

# Configuration
$webRoot = "C:\inetpub\Mindmate\Web"
$backendPath = "$webRoot\backend"
$frontendPath = "$webRoot\frontend"
$sourcePath = "C:\Users\azureadmin\Desktop\mind-mate"

Write-Host "`nStep 1: Creating directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $webRoot -Force | Out-Null
New-Item -ItemType Directory -Path $backendPath -Force | Out-Null
New-Item -ItemType Directory -Path $frontendPath -Force | Out-Null
Write-Host "  OK Directories created" -ForegroundColor Green

Write-Host "`nStep 2: Copying backend files..." -ForegroundColor Yellow
if (Test-Path "$sourcePath\backend") {
    Copy-Item -Path "$sourcePath\backend\*" -Destination $backendPath -Recurse -Force
    Write-Host "  OK Backend files copied" -ForegroundColor Green
} else {
    Write-Host "  FAILED Backend source not found at $sourcePath\backend" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 3: Copying frontend files..." -ForegroundColor Yellow
if (Test-Path "$sourcePath\frontend") {
    Copy-Item -Path "$sourcePath\frontend\*" -Destination $frontendPath -Recurse -Force
    Write-Host "  OK Frontend files copied" -ForegroundColor Green
} else {
    Write-Host "  FAILED Frontend source not found at $sourcePath\frontend" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 4: Copying web.config and privacy.html..." -ForegroundColor Yellow
if (Test-Path "$sourcePath\web.config") {
    Copy-Item -Path "$sourcePath\web.config" -Destination $webRoot -Force
    Write-Host "  OK web.config copied" -ForegroundColor Green
} else {
    Write-Host "  WARNING web.config not found" -ForegroundColor Yellow
}

if (Test-Path "$sourcePath\privacy.html") {
    Copy-Item -Path "$sourcePath\privacy.html" -Destination $webRoot -Force
    Write-Host "  OK privacy.html copied" -ForegroundColor Green
}

Write-Host "`nStep 5: Installing backend dependencies..." -ForegroundColor Yellow
Push-Location $backendPath
npm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  FAILED Backend npm install failed" -ForegroundColor Red
}
Pop-Location

Write-Host "`nStep 6: Building frontend..." -ForegroundColor Yellow
Push-Location $frontendPath
Write-Host "  Installing frontend dependencies..." -ForegroundColor Cyan
npm install 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Frontend dependencies installed" -ForegroundColor Green
    Write-Host "  Building frontend for production..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK Frontend built successfully" -ForegroundColor Green
        
        # Copy dist folder contents to web root for IIS
        Write-Host "  Copying dist files to web root..." -ForegroundColor Cyan
        if (Test-Path "dist") {
            Copy-Item -Path "dist\*" -Destination $webRoot -Recurse -Force
            Write-Host "  OK Frontend files deployed to web root" -ForegroundColor Green
        } else {
            Write-Host "  FAILED dist folder not found" -ForegroundColor Red
        }
    } else {
        Write-Host "  FAILED Frontend build failed" -ForegroundColor Red
    }
} else {
    Write-Host "  FAILED Frontend npm install failed" -ForegroundColor Red
}
Pop-Location

Write-Host "`nStep 7: Starting backend with PM2..." -ForegroundColor Yellow
Push-Location $backendPath
pm2 delete mindmate-backend 2>$null
pm2 start src\server.js --name mindmate-backend 2>&1 | Out-Null
pm2 save 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Backend started with PM2" -ForegroundColor Green
} else {
    Write-Host "  FAILED PM2 start failed" -ForegroundColor Red
}
Pop-Location

Write-Host "`nStep 8: Setting up IIS..." -ForegroundColor Yellow
try {
    Import-Module WebAdministration -ErrorAction Stop
    
    $siteName = "MindMate"
    $existingSite = Get-Website -Name $siteName -ErrorAction SilentlyContinue
    
    if ($existingSite) {
        Write-Host "  Site '$siteName' already exists - updating..." -ForegroundColor Cyan
        Set-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath -Value $webRoot
        Write-Host "  OK Site updated" -ForegroundColor Green
    } else {
        # Create application pool
        if (-not (Test-Path "IIS:\AppPools\MindMatePool")) {
            New-WebAppPool -Name "MindMatePool" | Out-Null
            Set-ItemProperty -Path "IIS:\AppPools\MindMatePool" -Name "managedRuntimeVersion" -Value ""
        }
        
        # Create website
        New-Website -Name $siteName -Port 80 -HostHeader "mindmate.aapnainfotech.in" -PhysicalPath $webRoot -ApplicationPool "MindMatePool" | Out-Null
        Write-Host "  OK IIS site created" -ForegroundColor Green
    }
}
catch {
    Write-Host "  FAILED IIS setup failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nStep 9: Setting permissions..." -ForegroundColor Yellow
try {
    $acl = Get-Acl $webRoot
    $permission = "IIS_IUSRS","FullControl","ContainerInherit,ObjectInherit","None","Allow"
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
    $acl.SetAccessRule($accessRule)
    Set-Acl $webRoot $acl
    Write-Host "  OK Permissions set" -ForegroundColor Green
}
catch {
    Write-Host "  WARNING Could not set permissions: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`nStep 10: Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce 2>&1 | Out-Null
Write-Host "  OK IIS restarted" -ForegroundColor Green

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "`nVerifying installation..." -ForegroundColor Yellow

# Verify
Write-Host "`nBackend status:" -ForegroundColor Cyan
pm2 status

Write-Host "`nTesting backend health:" -ForegroundColor Cyan
Start-Sleep -Seconds 2
try {
    $health = Invoke-RestMethod http://localhost:4000/health -ErrorAction Stop -TimeoutSec 5
    Write-Host "  OK Backend health check passed: $($health.status)" -ForegroundColor Green
}
catch {
    Write-Host "  FAILED Backend health check failed" -ForegroundColor Red
}

Write-Host "`nFrontend build check:" -ForegroundColor Cyan
if (Test-Path "$frontendPath\dist\index.html") {
    Write-Host "  OK Frontend build exists" -ForegroundColor Green
    $jsFiles = Get-ChildItem "$frontendPath\dist\assets\*.js" -ErrorAction SilentlyContinue
    Write-Host "  Found $($jsFiles.Count) JavaScript files" -ForegroundColor Cyan
} else {
    Write-Host "  FAILED Frontend build missing" -ForegroundColor Red
}

Write-Host "`n=== Next Steps ===" -ForegroundColor Yellow
Write-Host "1. Update Google Cloud Console:" -ForegroundColor White
Write-Host "   Authorized redirect URIs: https://mindmateapi.aapnainfotech.in/google-auth/callback" -ForegroundColor Cyan
Write-Host "   Authorized JavaScript origins: https://mindmate.aapnainfotech.in" -ForegroundColor Cyan
Write-Host "2. Test the site: https://mindmate.aapnainfotech.in" -ForegroundColor White
Write-Host "3. Check browser console (F12) for any errors" -ForegroundColor White
