# Update Mind Mate deployment (keeps existing IIS sites)
# Run this on production server as Administrator

Write-Host "=== Mind Mate Code Update ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$webRoot = "C:\inetpub\Mindmate\Web"
$backendPath = "$webRoot\backend"
$frontendPath = "$webRoot\frontend"
$sourcePath = "C:\Users\azureadmin\Desktop\mind-mate"

# Step 1: Stop backend
Write-Host "Step 1: Stopping backend..." -ForegroundColor Yellow
pm2 stop mindmate-backend -ErrorAction SilentlyContinue
Write-Host "  ✓ Backend stopped" -ForegroundColor Green

# Step 2: Update backend files
Write-Host ""
Write-Host "Step 2: Updating backend files..." -ForegroundColor Yellow
if (Test-Path "$sourcePath\backend") {
    # Remove old files but keep node_modules
    Get-ChildItem -Path $backendPath -Exclude node_modules | Remove-Item -Recurse -Force
    # Copy new files
    Copy-Item -Path "$sourcePath\backend\*" -Destination $backendPath -Recurse -Force -Exclude node_modules
    Write-Host "  ✓ Backend files updated" -ForegroundColor Green
} else {
    Write-Host "  ✗ Backend source not found!" -ForegroundColor Red
    exit 1
}

# Step 3: Install/update backend dependencies
Write-Host ""
Write-Host "Step 3: Installing backend dependencies..." -ForegroundColor Yellow
Push-Location $backendPath
npm install --production
Pop-Location
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green

# Step 4: Deploy backend web.config
Write-Host ""
Write-Host "Step 4: Deploying backend web.config..." -ForegroundColor Yellow
if (Test-Path "$sourcePath\backend-web.config") {
    Copy-Item -Path "$sourcePath\backend-web.config" -Destination "$backendPath\web.config" -Force
    Write-Host "  ✓ Backend web.config deployed" -ForegroundColor Green
}

# Step 5: Update frontend files
Write-Host ""
Write-Host "Step 5: Updating frontend files..." -ForegroundColor Yellow
if (Test-Path "$sourcePath\frontend") {
    # Remove old files but keep node_modules and dist
    Get-ChildItem -Path $frontendPath -Exclude node_modules,dist | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    # Copy new files
    Copy-Item -Path "$sourcePath\frontend\*" -Destination $frontendPath -Recurse -Force -Exclude node_modules
    Write-Host "  ✓ Frontend files updated" -ForegroundColor Green
} else {
    Write-Host "  ✗ Frontend source not found!" -ForegroundColor Red
    exit 1
}

# Step 6: Install frontend dependencies
Write-Host ""
Write-Host "Step 6: Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location $frontendPath
npm install
Pop-Location
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green

# Step 7: Build frontend
Write-Host ""
Write-Host "Step 7: Building frontend..." -ForegroundColor Yellow
Push-Location $frontendPath
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  ✓ Frontend built" -ForegroundColor Green

# Step 8: Copy built files to root
Write-Host ""
Write-Host "Step 8: Deploying frontend files..." -ForegroundColor Yellow
Copy-Item -Path "$frontendPath\dist\*" -Destination $frontendPath -Recurse -Force
Write-Host "  ✓ Frontend files deployed to root" -ForegroundColor Green

# Step 9: Deploy frontend web.config
Write-Host ""
Write-Host "Step 9: Deploying frontend web.config..." -ForegroundColor Yellow
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

# Step 10: Start backend
Write-Host ""
Write-Host "Step 10: Starting backend..." -ForegroundColor Yellow
Push-Location $backendPath
pm2 delete mindmate-backend -ErrorAction SilentlyContinue
pm2 start src\server.js --name mindmate-backend
pm2 save
Pop-Location
Write-Host "  ✓ Backend started" -ForegroundColor Green

# Step 11: Restart IIS
Write-Host ""
Write-Host "Step 11: Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce
Write-Host "  ✓ IIS restarted" -ForegroundColor Green

# Show status
Write-Host ""
Write-Host "=== Update Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "IIS Sites:" -ForegroundColor Yellow
Import-Module WebAdministration
Get-Website | Where-Object { $_.Name -like '*MindMate*' } | Format-Table Name, State, physicalPath -AutoSize

Write-Host ""
Write-Host "PM2 Status:" -ForegroundColor Yellow
pm2 list

Write-Host ""
Write-Host "Verify files:" -ForegroundColor Yellow
Write-Host "  Frontend index.html: $(Test-Path "$frontendPath\index.html")" -ForegroundColor Cyan
Write-Host "  Backend server.js:   $(Test-Path "$backendPath\src\server.js")" -ForegroundColor Cyan

Write-Host ""
Write-Host "Test URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://mindmate.aapnainfotech.in" -ForegroundColor Cyan
Write-Host "  Backend:  http://mindmateapi.aapnainfotech.in/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Deployment successful!" -ForegroundColor Green
