# Complete Mind Mate Deployment - Production Server
# Run this on production server as Administrator

Write-Host "=== Mind Mate Complete Deployment ===" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Pull latest code
Write-Host "Step 1: Pulling latest code from GitHub..." -ForegroundColor Yellow
cd C:\Users\azureadmin\Desktop\mind-mate
git fetch origin
git checkout production-deployment
git pull origin production-deployment
Write-Host "  ✓ Code updated" -ForegroundColor Green

# Step 2: Build frontend
Write-Host ""
Write-Host "Step 2: Building frontend..." -ForegroundColor Yellow
cd C:\Users\azureadmin\Desktop\mind-mate\frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm install failed!" -ForegroundColor Red
    exit 1
}
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Frontend built" -ForegroundColor Green

# Step 3: Verify build exists
Write-Host ""
Write-Host "Step 3: Verifying build..." -ForegroundColor Yellow
if (-not (Test-Path "C:\Users\azureadmin\Desktop\mind-mate\frontend\dist\index.html")) {
    Write-Host "  ✗ Build failed - index.html not found!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Build verified" -ForegroundColor Green

# Step 4: Stop backend
Write-Host ""
Write-Host "Step 4: Stopping backend..." -ForegroundColor Yellow
pm2 stop mindmate-backend -ErrorAction SilentlyContinue
pm2 delete mindmate-backend -ErrorAction SilentlyContinue
Write-Host "  ✓ Backend stopped" -ForegroundColor Green

# Step 5: Deploy frontend
Write-Host ""
Write-Host "Step 5: Deploying frontend..." -ForegroundColor Yellow
$frontendDest = "C:\inetpub\Mindmate\Web\frontend"
if (-not (Test-Path $frontendDest)) {
    New-Item -Path $frontendDest -ItemType Directory -Force | Out-Null
}
# Copy all frontend files
Copy-Item -Path "C:\Users\azureadmin\Desktop\mind-mate\frontend\*" -Destination $frontendDest -Recurse -Force
# Copy dist contents to root for serving
Copy-Item -Path "$frontendDest\dist\*" -Destination $frontendDest -Recurse -Force
Write-Host "  ✓ Frontend deployed" -ForegroundColor Green

# Step 6: Deploy backend
Write-Host ""
Write-Host "Step 6: Deploying backend..." -ForegroundColor Yellow
$backendDest = "C:\inetpub\Mindmate\Web\backend"
if (-not (Test-Path $backendDest)) {
    New-Item -Path $backendDest -ItemType Directory -Force | Out-Null
}
# Remove old files except node_modules
Get-ChildItem -Path $backendDest -Exclude node_modules | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
# Copy new files
Copy-Item -Path "C:\Users\azureadmin\Desktop\mind-mate\backend\*" -Destination $backendDest -Recurse -Force -Exclude node_modules
Write-Host "  ✓ Backend deployed" -ForegroundColor Green

# Step 7: Install backend dependencies
Write-Host ""
Write-Host "Step 7: Installing backend dependencies..." -ForegroundColor Yellow
cd $backendDest
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green

# Step 8: Create/update web.config files
Write-Host ""
Write-Host "Step 8: Creating web.config files..." -ForegroundColor Yellow

# Backend web.config
$backendWebConfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Node.js Backend" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://localhost:4000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
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
$backendWebConfig | Out-File -FilePath "$backendDest\web.config" -Encoding UTF8 -Force

# Frontend web.config
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
$frontendWebConfig | Out-File -FilePath "$frontendDest\web.config" -Encoding UTF8 -Force
Write-Host "  ✓ web.config files created" -ForegroundColor Green

# Step 9: Configure IIS sites
Write-Host ""
Write-Host "Step 9: Configuring IIS sites..." -ForegroundColor Yellow
Import-Module WebAdministration

# Stop old conflicting sites
@('Mindmate', 'Default Web Site') | ForEach-Object {
    if (Get-Website -Name $_ -ErrorAction SilentlyContinue) {
        Stop-Website -Name $_ -ErrorAction SilentlyContinue
        Write-Host "  - Stopped: $_" -ForegroundColor Gray
    }
}

# Configure Frontend site
if (Get-Website -Name 'MindMateFrontend' -ErrorAction SilentlyContinue) {
    Set-ItemProperty "IIS:\Sites\MindMateFrontend" -Name physicalPath -Value $frontendDest
    Write-Host "  ✓ Updated MindMateFrontend" -ForegroundColor Green
} else {
    New-Website -Name 'MindMateFrontend' -PhysicalPath $frontendDest -Port 80 -HostHeader 'mindmate.aapnainfotech.in' -Force
    Write-Host "  ✓ Created MindMateFrontend" -ForegroundColor Green
}
Start-Website -Name 'MindMateFrontend'

# Configure Backend site
if (Get-Website -Name 'MindmateAPI' -ErrorAction SilentlyContinue) {
    Set-ItemProperty "IIS:\Sites\MindmateAPI" -Name physicalPath -Value $backendDest
    Write-Host "  ✓ Updated MindmateAPI" -ForegroundColor Green
} else {
    New-Website -Name 'MindmateAPI' -PhysicalPath $backendDest -Port 80 -HostHeader 'mindmateapi.aapnainfotech.in' -Force
    Write-Host "  ✓ Created MindmateAPI" -ForegroundColor Green
}
Start-Website -Name 'MindmateAPI'

# Step 10: Set permissions
Write-Host ""
Write-Host "Step 10: Setting permissions..." -ForegroundColor Yellow
$acl = Get-Acl "C:\inetpub\Mindmate\Web"
$permission = "IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl "C:\inetpub\Mindmate\Web" $acl
Write-Host "  ✓ Permissions set" -ForegroundColor Green

# Step 11: Start backend with PM2
Write-Host ""
Write-Host "Step 11: Starting backend..." -ForegroundColor Yellow
cd $backendDest
pm2 start src\server.js --name mindmate-backend
pm2 save
Write-Host "  ✓ Backend started on port 4000" -ForegroundColor Green

# Step 12: Restart IIS
Write-Host ""
Write-Host "Step 12: Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce
Start-Sleep -Seconds 3
Write-Host "  ✓ IIS restarted" -ForegroundColor Green

# Step 13: Verify deployment
Write-Host ""
Write-Host "=== Deployment Verification ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "File Structure:" -ForegroundColor Yellow
Write-Host "  Frontend index.html: $(Test-Path "$frontendDest\index.html")" -ForegroundColor Cyan
Write-Host "  Frontend web.config: $(Test-Path "$frontendDest\web.config")" -ForegroundColor Cyan
Write-Host "  Backend server.js:   $(Test-Path "$backendDest\src\server.js")" -ForegroundColor Cyan
Write-Host "  Backend web.config:  $(Test-Path "$backendDest\web.config")" -ForegroundColor Cyan

Write-Host ""
Write-Host "IIS Sites:" -ForegroundColor Yellow
Get-Website | Where-Object { $_.Name -like '*MindMate*' } | Format-Table Name, State, @{Label="Binding";Expression={$_.bindings.Collection.bindingInformation}} -AutoSize

Write-Host ""
Write-Host "PM2 Status:" -ForegroundColor Yellow
pm2 list

Write-Host ""
Write-Host "Testing URLs:" -ForegroundColor Yellow
try {
    $frontendTest = Invoke-WebRequest -Uri "http://localhost" -Headers @{Host='mindmate.aapnainfotech.in'} -UseBasicParsing -TimeoutSec 10
    Write-Host "  Frontend: HTTP $($frontendTest.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  Frontend: Error - $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $backendTest = Invoke-WebRequest -Uri "http://localhost/health" -Headers @{Host='mindmateapi.aapnainfotech.in'} -UseBasicParsing -TimeoutSec 10
    Write-Host "  Backend: HTTP $($backendTest.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  Backend: Error - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your application at:" -ForegroundColor Yellow
Write-Host "  Frontend: http://mindmate.aapnainfotech.in" -ForegroundColor Cyan
Write-Host "  Backend API: http://mindmateapi.aapnainfotech.in/health" -ForegroundColor Cyan
Write-Host ""
