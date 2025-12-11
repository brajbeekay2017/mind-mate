# Fix API_URL template literals in all frontend files

Write-Host "Fixing API_URL template literals..." -ForegroundColor Yellow

$files = Get-ChildItem -Path ".\frontend\src" -Recurse -Include "*.jsx","*.js"
$fixCount = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Fix various broken patterns
    $content = $content -replace '"?\$\{API_URL\}/([^"''`]+)[''`"]', '`${API_URL}/$1`'
    $content = $content -replace '''?\$\{API_URL\}/([^"''`]+)[''`"]', '`${API_URL}/$1`'
    $content = $content -replace '"?\$\{API_URL\}[''`"]', '`${API_URL}`'
    $content = $content -replace '''?\$\{API_URL\}[''`"]', '`${API_URL}`'
    
    if ($content -ne $original) {
        Set-Content $file.FullName $content -NoNewline
        Write-Host "  Fixed: $($file.Name)" -ForegroundColor Green
        $fixCount++
    }
}

Write-Host "`nFixed $fixCount files" -ForegroundColor Cyan
