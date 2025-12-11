# Mind Mate Auto-Fix Script
# Run this on production server as Administrator if site is not working

Write-Host "=== Mind Mate Auto-Fix Script ===" -ForegroundColor Cyan
Write-Host ""

Import-Module WebAdministration

$webRoot = "C:\inetpub\Mindmate\Web"
$backendPath = "$webRoot\backend"
$frontendPath = "$webRoot\frontend"

# Issue 1: Check if files exist
Write-Host "Step 1: Checking file structure..." -ForegroundColor Yellow
$frontendIndexExists = Test-Path "$frontendPath\index.html"
$backendServerExists = Test-Path "$backendPath\src\server.js"

Write-Host "  Frontend index.html: $frontendIndexExists" -ForegroundColor $(if($frontendIndexExists){'Green'}else{'Red'})
Write-Host "  Backend server.js: $backendServerExists" -ForegroundColor $(if($backendServerExists){'Green'}else{'Red'})

if (-not $frontendIndexExists -and (Test-Path "$frontendPath\dist\index.html")) {
    Write-Host "  ⚠ Files are in dist folder, copying to root..." -ForegroundColor Yellow
    Copy-Item -Path "$frontendPath\dist\*" -Destination $frontendPath -Recurse -Force
    Write-Host "  ✓ Files copied to root" -ForegroundColor Green
}

# Issue 2: Check IIS sites
Write-Host ""
Write-Host "Step 2: Checking IIS sites..." -ForegroundColor Yellow
$frontendSite = Get-Website -Name 'MindMateFrontend' -ErrorAction SilentlyContinue
$apiSite = Get-Website -Name 'MindmateAPI' -ErrorAction SilentlyContinue

if (-not $frontendSite) {
    Write-Host "  ⚠ MindMateFrontend site missing, creating..." -ForegroundColor Yellow
    New-Website -Name 'MindMateFrontend' -PhysicalPath $frontendPath -Port 80 -HostHeader 'mindmate.aapnainfotech.in' -Force
    Write-Host "  ✓ MindMateFrontend created" -ForegroundColor Green
} else {
    Write-Host "  ✓ MindMateFrontend exists" -ForegroundColor Green
    Start-Website -Name 'MindMateFrontend' -ErrorAction SilentlyContinue
}

if (-not $apiSite) {
    Write-Host "  ⚠ MindmateAPI site missing, creating..." -ForegroundColor Yellow
    New-Website -Name 'MindmateAPI' -PhysicalPath $backendPath -Port 80 -HostHeader 'mindmateapi.aapnainfotech.in' -Force
    Write-Host "  ✓ MindmateAPI created" -ForegroundColor Green
} else {
    Write-Host "  ✓ MindmateAPI exists" -ForegroundColor Green
    Start-Website -Name 'MindmateAPI' -ErrorAction SilentlyContinue
}

# Issue 3: Remove old conflicting site
Write-Host ""
Write-Host "Step 3: Removing old conflicting sites..." -ForegroundColor Yellow
@('Mindmate', 'Default Web Site') | ForEach-Object {
    if (Get-Website -Name $_ -ErrorAction SilentlyContinue) {
        Stop-Website -Name $_ -ErrorAction SilentlyContinue
        Write-Host "  ✓ Stopped conflicting site: $_" -ForegroundColor Green
    }
}

# Issue 4: Fix frontend web.config
Write-Host ""
Write-Host "Step 4: Fixing frontend web.config..." -ForegroundColor Yellow
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
Write-Host "  ✓ Frontend web.config updated" -ForegroundColor Green

# Issue 5: Fix backend web.config
Write-Host ""
Write-Host "Step 5: Fixing backend web.config..." -ForegroundColor Yellow
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
$backendWebConfig | Out-File -FilePath "$backendPath\web.config" -Encoding UTF8 -Force
Write-Host "  ✓ Backend web.config updated" -ForegroundColor Green

# Issue 6: Check and fix PM2 backend
Write-Host ""
Write-Host "Step 6: Checking backend PM2 process..." -ForegroundColor Yellow
$pm2List = pm2 list | Out-String
if ($pm2List -notmatch "mindmate-backend") {
    Write-Host "  ⚠ Backend not running, starting..." -ForegroundColor Yellow
    Push-Location $backendPath
    pm2 start src\server.js --name mindmate-backend
    pm2 save
    Pop-Location
    Write-Host "  ✓ Backend started" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Restarting backend..." -ForegroundColor Yellow
    pm2 restart mindmate-backend
    Write-Host "  ✓ Backend restarted" -ForegroundColor Green
}

# Issue 7: Check URL Rewrite module
Write-Host ""
Write-Host "Step 7: Checking URL Rewrite module..." -ForegroundColor Yellow
$rewriteModule = Get-WebGlobalModule | Where-Object { $_.Name -eq 'RewriteModule' }
if ($rewriteModule) {
    Write-Host "  ✓ URL Rewrite module installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ URL Rewrite module NOT installed!" -ForegroundColor Red
    Write-Host "    Download from: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
}

# Issue 8: Set permissions
Write-Host ""
Write-Host "Step 8: Setting permissions..." -ForegroundColor Yellow
$acl = Get-Acl $webRoot
$permission = "IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl $webRoot $acl
Write-Host "  ✓ Permissions set" -ForegroundColor Green

# Issue 9: Restart IIS
Write-Host ""
Write-Host "Step 9: Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce
Start-Sleep -Seconds 3
Write-Host "  ✓ IIS restarted" -ForegroundColor Green

# Issue 10: Final verification
Write-Host ""
Write-Host "=== Final Status ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "IIS Sites:" -ForegroundColor Yellow
Get-Website | Where-Object { $_.Name -like '*MindMate*' } | Format-Table Name, State, @{Label="Binding";Expression={$_.bindings.Collection.bindingInformation}}, physicalPath -AutoSize

Write-Host ""
Write-Host "PM2 Status:" -ForegroundColor Yellow
pm2 list

Write-Host ""
Write-Host "File Check:" -ForegroundColor Yellow
Write-Host "  Frontend index.html: $(Test-Path "$frontendPath\index.html")" -ForegroundColor Cyan
Write-Host "  Frontend web.config: $(Test-Path "$frontendPath\web.config")" -ForegroundColor Cyan
Write-Host "  Backend server.js:   $(Test-Path "$backendPath\src\server.js")" -ForegroundColor Cyan
Write-Host "  Backend web.config:  $(Test-Path "$backendPath\web.config")" -ForegroundColor Cyan

Write-Host ""
Write-Host "Test URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://mindmate.aapnainfotech.in" -ForegroundColor Cyan
Write-Host "  Backend:  http://mindmateapi.aapnainfotech.in/health" -ForegroundColor Cyan

Write-Host ""
Write-Host "Testing connectivity..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost" -Headers @{Host='mindmate.aapnainfotech.in'} -UseBasicParsing -TimeoutSec 5
    Write-Host "  ✓ Frontend responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Frontend not responding: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost/health" -Headers @{Host='mindmateapi.aapnainfotech.in'} -UseBasicParsing -TimeoutSec 5
    Write-Host "  ✓ Backend responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Backend not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✓ Auto-fix complete!" -ForegroundColor Green
Write-Host ""
Write-Host "If still not working, check:" -ForegroundColor Yellow
Write-Host "  1. DNS points to this server" -ForegroundColor Gray
Write-Host "  2. Port 80 is open in firewall" -ForegroundColor Gray
Write-Host "  3. No other service using port 80 or 4000" -ForegroundColor Gray
