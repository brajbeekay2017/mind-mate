# Diagnose IIS Configuration for Mind Mate
# Run this on the production server to check current state

Write-Host "=== Mind Mate IIS Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

Import-Module WebAdministration

# Check IIS sites
Write-Host "1. IIS Sites:" -ForegroundColor Yellow
$sites = Get-Website | Where-Object { $_.Name -like '*MindMate*' }
if ($sites) {
    $sites | Format-Table Name, State, @{Label="Bindings";Expression={$_.bindings.Collection.bindingInformation}}, physicalPath -AutoSize
} else {
    Write-Host "  No MindMate sites found" -ForegroundColor Red
}

# Check physical paths
Write-Host ""
Write-Host "2. File Structure:" -ForegroundColor Yellow
$deployPath = "C:\inetpub\Mindmate\Web"
if (Test-Path $deployPath) {
    Write-Host "  Deployment path exists: $deployPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Frontend files:" -ForegroundColor Cyan
    Write-Host "    index.html in root: $(Test-Path "$deployPath\frontend\index.html")"
    Write-Host "    index.html in dist: $(Test-Path "$deployPath\frontend\dist\index.html")"
    Write-Host "    web.config: $(Test-Path "$deployPath\frontend\web.config")"
    
    Write-Host ""
    Write-Host "  Backend files:" -ForegroundColor Cyan
    Write-Host "    server.js: $(Test-Path "$deployPath\backend\src\server.js")"
    Write-Host "    web.config: $(Test-Path "$deployPath\backend\web.config")"
    Write-Host "    .env: $(Test-Path "$deployPath\backend\.env")"
} else {
    Write-Host "  Deployment path doesn't exist: $deployPath" -ForegroundColor Red
}

# Check PM2
Write-Host ""
Write-Host "3. PM2 Status:" -ForegroundColor Yellow
pm2 list

# Check URL Rewrite module
Write-Host ""
Write-Host "4. IIS URL Rewrite Module:" -ForegroundColor Yellow
$rewriteModule = Get-WebGlobalModule | Where-Object { $_.Name -eq 'RewriteModule' }
if ($rewriteModule) {
    Write-Host "  ✓ URL Rewrite module installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ URL Rewrite module NOT installed" -ForegroundColor Red
    Write-Host "    Download from: https://www.iis.net/downloads/microsoft/url-rewrite" -ForegroundColor Yellow
}

# Check default documents
Write-Host ""
Write-Host "5. Default Documents (MindMateFrontend):" -ForegroundColor Yellow
if (Get-Website -Name 'MindMateFrontend' -ErrorAction SilentlyContinue) {
    $defaultDocs = Get-WebConfiguration -Filter "system.webServer/defaultDocument/files/*" -PSPath "IIS:\Sites\MindMateFrontend"
    $defaultDocs | Format-Table value -AutoSize
} else {
    Write-Host "  MindMateFrontend site not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Diagnostic Complete ===" -ForegroundColor Cyan
