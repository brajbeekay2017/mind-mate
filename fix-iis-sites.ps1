# Fix IIS Sites Configuration for Mind Mate
# Run this on the production server as Administrator

Write-Host "=== Fixing Mind Mate IIS Configuration ===" -ForegroundColor Cyan
Write-Host ""

Import-Module WebAdministration

# Step 1: Remove old Mindmate site (conflicting)
Write-Host "Step 1: Removing old 'Mindmate' site..." -ForegroundColor Yellow
if (Get-Website -Name 'Mindmate' -ErrorAction SilentlyContinue) {
    Stop-Website -Name 'Mindmate' -ErrorAction SilentlyContinue
    Remove-Website -Name 'Mindmate' -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed old 'Mindmate' site" -ForegroundColor Green
} else {
    Write-Host "  - Old site doesn't exist" -ForegroundColor Gray
}

# Step 2: Verify frontend files are in root (not just dist)
Write-Host ""
Write-Host "Step 2: Copying frontend files to root..." -ForegroundColor Yellow
$frontendPath = "C:\inetpub\Mindmate\Web\frontend"
if (Test-Path "$frontendPath\dist\index.html") {
    Copy-Item -Path "$frontendPath\dist\*" -Destination "$frontendPath\" -Recurse -Force
    Write-Host "  ✓ Copied files from dist to root" -ForegroundColor Green
} else {
    Write-Host "  ✗ dist/index.html not found!" -ForegroundColor Red
}

# Step 3: Update frontend web.config to serve from root
Write-Host ""
Write-Host "Step 3: Updating frontend web.config..." -ForegroundColor Yellow
$webConfigContent = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <!-- Enable URL Rewrite -->
    <rewrite>
      <rules>
        <!-- Serve static assets directly -->
        <rule name="Static Assets" stopProcessing="true">
          <match url="^assets/(.*)$" />
          <action type="Rewrite" url="assets/{R:1}" />
        </rule>
        <!-- Serve images directly -->
        <rule name="Images" stopProcessing="true">
          <match url="^Images/(.*)$" />
          <action type="Rewrite" url="Images/{R:1}" />
        </rule>
        <!-- React Router - redirect all other requests to index.html -->
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
    
    <!-- Default document -->
    <defaultDocument enabled="true">
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
    
    <!-- Static content MIME types -->
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
    
    <!-- CORS headers -->
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

$webConfigContent | Out-File -FilePath "$frontendPath\web.config" -Encoding UTF8 -Force
Write-Host "  ✓ Updated web.config to serve from root" -ForegroundColor Green

# Step 4: Ensure correct bindings
Write-Host ""
Write-Host "Step 4: Verifying IIS site bindings..." -ForegroundColor Yellow

# Check MindMateFrontend
$frontendSite = Get-Website -Name 'MindMateFrontend' -ErrorAction SilentlyContinue
if ($frontendSite) {
    $frontendBinding = Get-WebBinding -Name 'MindMateFrontend' -Protocol http
    if ($frontendBinding.bindingInformation -notlike "*mindmate.aapnainfotech.in*") {
        Remove-WebBinding -Name 'MindMateFrontend' -Protocol http -HostHeader * -ErrorAction SilentlyContinue
        New-WebBinding -Name 'MindMateFrontend' -Protocol http -Port 80 -HostHeader 'mindmate.aapnainfotech.in'
        Write-Host "  ✓ Fixed MindMateFrontend binding" -ForegroundColor Green
    } else {
        Write-Host "  ✓ MindMateFrontend binding correct" -ForegroundColor Green
    }
    Start-Website -Name 'MindMateFrontend' -ErrorAction SilentlyContinue
} else {
    Write-Host "  ✗ MindMateFrontend site not found!" -ForegroundColor Red
}

# Check MindmateAPI
$apiSite = Get-Website -Name 'MindmateAPI' -ErrorAction SilentlyContinue
if ($apiSite) {
    $apiBinding = Get-WebBinding -Name 'MindmateAPI' -Protocol http
    if ($apiBinding.bindingInformation -notlike "*mindmateapi.aapnainfotech.in*") {
        Remove-WebBinding -Name 'MindmateAPI' -Protocol http -HostHeader * -ErrorAction SilentlyContinue
        New-WebBinding -Name 'MindmateAPI' -Protocol http -Port 80 -HostHeader 'mindmateapi.aapnainfotech.in'
        Write-Host "  ✓ Fixed MindmateAPI binding" -ForegroundColor Green
    } else {
        Write-Host "  ✓ MindmateAPI binding correct" -ForegroundColor Green
    }
    Start-Website -Name 'MindmateAPI' -ErrorAction SilentlyContinue
} else {
    Write-Host "  ✗ MindmateAPI site not found!" -ForegroundColor Red
}

# Step 5: Restart IIS
Write-Host ""
Write-Host "Step 5: Restarting IIS..." -ForegroundColor Yellow
iisreset /noforce
Write-Host "  ✓ IIS restarted" -ForegroundColor Green

# Step 6: Verify configuration
Write-Host ""
Write-Host "=== Current Configuration ===" -ForegroundColor Cyan
Get-Website | Where-Object { $_.Name -like '*MindMate*' } | Format-Table Name, State, @{Label="Binding";Expression={$_.bindings.Collection.bindingInformation}}, physicalPath -AutoSize

Write-Host ""
Write-Host "=== Testing ===" -ForegroundColor Cyan
Write-Host "Frontend: http://mindmate.aapnainfotech.in"
Write-Host "Backend:  http://mindmateapi.aapnainfotech.in/health"
Write-Host ""
Write-Host "✓ Configuration complete!" -ForegroundColor Green
