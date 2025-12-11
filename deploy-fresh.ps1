# Fresh Mind Mate Deployment Script
# Run this on production server as Administrator
# This will deploy everything from scratch

Write-Host "=== Mind Mate Fresh Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$gitRepo = "https://github.com/brajbeekay2017/mind-mate.git"
$branch = "production-deployment"
$webRoot = "C:\inetpub\Mindmate\Web"
$backendPath = "$webRoot\backend"
$frontendPath = "$webRoot\frontend"
$tempPath = "C:\Temp\mind-mate-deploy"

# Step 1: Clean up old deployment
Write-Host "Step 1: Cleaning up old deployment..." -ForegroundColor Yellow
Import-Module WebAdministration

# Stop and remove old sites
@('Mindmate', 'MindMateFrontend', 'MindmateAPI', 'MindMateAPI') | ForEach-Object {
    if (Get-Website -Name $_ -ErrorAction SilentlyContinue) {
        Stop-Website -Name $_ -ErrorAction SilentlyContinue
        Remove-Website -Name $_ -ErrorAction SilentlyContinue
        Write-Host "  ✓ Removed site: $_" -ForegroundColor Green
    }
}

# Stop PM2
pm2 stop all -ErrorAction SilentlyContinue
pm2 delete all -ErrorAction SilentlyContinue

# Clean directories
if (Test-Path $webRoot) {
    Remove-Item -Path $webRoot -Recurse -Force
    Write-Host "  ✓ Cleaned $webRoot" -ForegroundColor Green
}
if (Test-Path $tempPath) {
    Remove-Item -Path $tempPath -Recurse -Force
}

# Step 2: Clone fresh code from GitHub
Write-Host ""
Write-Host "Step 2: Cloning code from GitHub..." -ForegroundColor Yellow
New-Item -Path $tempPath -ItemType Directory -Force | Out-Null
Push-Location $tempPath
git clone -b $branch $gitRepo .
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Git clone failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Code cloned from branch: $branch" -ForegroundColor Green
Pop-Location

# Step 3: Create deployment structure
Write-Host ""
Write-Host "Step 3: Creating deployment structure..." -ForegroundColor Yellow
New-Item -Path $webRoot -ItemType Directory -Force | Out-Null
New-Item -Path $backendPath -ItemType Directory -Force | Out-Null
New-Item -Path $frontendPath -ItemType Directory -Force | Out-Null
Write-Host "  ✓ Directories created" -ForegroundColor Green

# Step 4: Copy backend files
Write-Host ""
Write-Host "Step 4: Deploying backend..." -ForegroundColor Yellow
Copy-Item -Path "$tempPath\backend\*" -Destination $backendPath -Recurse -Force
Write-Host "  ✓ Backend files copied" -ForegroundColor Green

# Step 5: Copy frontend files
Write-Host ""
Write-Host "Step 5: Deploying frontend..." -ForegroundColor Yellow
Copy-Item -Path "$tempPath\frontend\*" -Destination $frontendPath -Recurse -Force
Write-Host "  ✓ Frontend files copied" -ForegroundColor Green

# Step 6: Install backend dependencies
Write-Host ""
Write-Host "Step 6: Installing backend dependencies..." -ForegroundColor Yellow
Push-Location $backendPath
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm install failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green
Pop-Location

# Step 7: Build frontend
Write-Host ""
Write-Host "Step 7: Building frontend..." -ForegroundColor Yellow
Push-Location $frontendPath
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm install failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "  ✓ Frontend built successfully" -ForegroundColor Green
Pop-Location

# Step 8: Copy frontend build to root (for easier serving)
Write-Host ""
Write-Host "Step 8: Preparing frontend files..." -ForegroundColor Yellow
Copy-Item -Path "$frontendPath\dist\*" -Destination $frontendPath -Recurse -Force
Write-Host "  ✓ Frontend files prepared" -ForegroundColor Green

# Step 9: Deploy web.config files
Write-Host ""
Write-Host "Step 9: Deploying web.config files..." -ForegroundColor Yellow

# Backend web.config
if (Test-Path "$tempPath\backend-web.config") {
    Copy-Item -Path "$tempPath\backend-web.config" -Destination "$backendPath\web.config" -Force
    Write-Host "  ✓ Backend web.config deployed" -ForegroundColor Green
} else {
    Write-Host "  ✗ backend-web.config not found!" -ForegroundColor Red
}

# Frontend web.config (updated to serve from root)
$frontendWebConfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Static Assets" stopProcessing="true">
          <match url="^assets/(.*)$" />
          <action type="Rewrite" url="assets/{R:1}" />
        </rule>
        <rule name="Images" stopProcessing="true">
          <match url="^Images/(.*)$" />
          <action type="Rewrite" url="Images/{R:1}" />
        </rule>
        <rule name="React Router SPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="index.html" />
        </rule>
      </rules>
    </rewrite>
    <defaultDocument enabled="true">
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="Access-Control-Allow-Origin" value="*" />
        <add name="Access-Control-Allow-Methods" value="GET, POST, PUT, DELETE, OPTIONS" />
        <add name="Access-Control-Allow-Headers" value="Content-Type, Authorization" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
'@
$frontendWebConfig | Out-File -FilePath "$frontendPath\web.config" -Encoding UTF8 -Force
Write-Host "  ✓ Frontend web.config deployed" -ForegroundColor Green

# Step 10: Start backend with PM2
Write-Host ""
Write-Host "Step 10: Starting backend with PM2..." -ForegroundColor Yellow
Push-Location $backendPath
pm2 start src\server.js --name mindmate-backend --watch
pm2 save
Write-Host "  ✓ Backend started on port 4000" -ForegroundColor Green
Pop-Location

# Step 11: Create IIS sites
Write-Host ""
Write-Host "Step 11: Creating IIS sites..." -ForegroundColor Yellow

# Create Frontend site
if (Get-Website -Name 'MindMateFrontend' -ErrorAction SilentlyContinue) {
    Remove-Website -Name 'MindMateFrontend'
}
New-Website -Name 'MindMateFrontend' -PhysicalPath $frontendPath -Port 80 -HostHeader 'mindmate.aapnainfotech.in' -Force
Start-Website -Name 'MindMateFrontend'
Write-Host "  ✓ MindMateFrontend site created" -ForegroundColor Green

# Create Backend API site
if (Get-Website -Name 'MindMateAPI' -ErrorAction SilentlyContinue) {
    Remove-Website -Name 'MindMateAPI'
}
New-Website -Name 'MindMateAPI' -PhysicalPath $backendPath -Port 80 -HostHeader 'mindmateapi.aapnainfotech.in' -Force
Start-Website -Name 'MindMateAPI'
Write-Host "  ✓ MindMateAPI site created" -ForegroundColor Green

# Step 12: Set permissions
Write-Host ""
Write-Host "Step 12: Setting permissions..." -ForegroundColor Yellow
$acl = Get-Acl $webRoot
$permission = "IIS_IUSRS", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl $webRoot $acl
Write-Host "  ✓ Permissions set" -ForegroundColor Green

# Step 13: Restart IIS
Write-Host ""
Write-Host "Step 13: Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce
Write-Host "  ✓ IIS restarted" -ForegroundColor Green

# Step 14: Clean up temp files
Write-Host ""
Write-Host "Step 14: Cleaning up..." -ForegroundColor Yellow
if (Test-Path $tempPath) {
    Remove-Item -Path $tempPath -Recurse -Force
    Write-Host "  ✓ Temp files cleaned" -ForegroundColor Green
}

# Final status
Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "IIS Sites:" -ForegroundColor Yellow
Get-Website | Where-Object { $_.Name -like '*MindMate*' } | Format-Table Name, State, @{Label="Binding";Expression={$_.bindings.Collection.bindingInformation}}, physicalPath -AutoSize

Write-Host ""
Write-Host "PM2 Status:" -ForegroundColor Yellow
pm2 list

Write-Host ""
Write-Host "Test URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://mindmate.aapnainfotech.in" -ForegroundColor Cyan
Write-Host "  Backend:  http://mindmateapi.aapnainfotech.in/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Deployment successful!" -ForegroundColor Green
