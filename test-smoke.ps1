# Smoke Test Suite for AI Features

$baseUrl = "http://localhost:4000"

Write-Host "=== SMOKE TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Backend: $baseUrl`n" -ForegroundColor Yellow

# Test 1: Health Check
Write-Host "TEST 1: Health Check" -ForegroundColor Green
try {
  $resp = Invoke-RestMethod -Uri "$baseUrl/" -Method GET
  Write-Host "✅ Backend responding: $($resp.message)" -ForegroundColor Green
} catch {
  Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test 2: Generate Stress Recovery Challenge
Write-Host "`nTEST 2: Generate Stress Recovery Challenge" -ForegroundColor Green
try {
  $body = @{ userId = "user-1" } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$baseUrl/stress-recovery/generate" -Method POST -ContentType "application/json" -Body $body
  Write-Host "✅ Challenge generated:" -ForegroundColor Green
  Write-Host ($resp | ConvertTo-Json -Depth 3) -ForegroundColor Cyan
} catch {
  Write-Host "❌ Generate challenge failed: $_" -ForegroundColor Red
}

# Test 3: Start Stress Recovery Challenge
Write-Host "`nTEST 3: Start Stress Recovery Challenge (SSE broadcast)" -ForegroundColor Green
try {
  $challenge = @{ title = "3-Day Recovery"; plan = @("Day 1: Rest", "Day 2: Light Activity", "Day 3: Reflect") }
  $body = @{ userId = "user-1"; challenge = $challenge } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$baseUrl/stress-recovery/start" -Method POST -ContentType "application/json" -Body $body
  Write-Host "✅ Challenge started: $($resp | ConvertTo-Json)" -ForegroundColor Green
} catch {
  Write-Host "❌ Start challenge failed: $_" -ForegroundColor Red
}

# Test 4: Complete Stress Recovery Challenge
Write-Host "`nTEST 4: Complete Stress Recovery Challenge" -ForegroundColor Green
try {
  $body = @{ userId = "user-1" } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$baseUrl/stress-recovery/complete" -Method POST -ContentType "application/json" -Body $body
  Write-Host "✅ Challenge completed: $($resp | ConvertTo-Json)" -ForegroundColor Green
} catch {
  Write-Host "❌ Complete challenge failed: $_" -ForegroundColor Red
}

# Test 5: Generate Smart Recommendations
Write-Host "`nTEST 5: Generate Smart Wellness Recommendations" -ForegroundColor Green
try {
  $body = @{ userId = "user-1"; moodData = @(); journalData = @() } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$baseUrl/recommendations/generate" -Method POST -ContentType "application/json" -Body $body
  Write-Host "✅ Recommendations generated:" -ForegroundColor Green
  Write-Host ($resp | ConvertTo-Json -Depth 3) -ForegroundColor Cyan
} catch {
  Write-Host "❌ Generate recommendations failed: $_" -ForegroundColor Red
}

# Test 6: Post Team Alert
Write-Host "`nTEST 6: Post Team Alert" -ForegroundColor Green
try {
  $body = @{ teamId = "team-1"; message = "Test burnout alert"; level = "warning" } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$baseUrl/team-alerts/alert" -Method POST -ContentType "application/json" -Body $body
  Write-Host "✅ Team alert posted: $($resp | ConvertTo-Json)" -ForegroundColor Green
} catch {
  Write-Host "❌ Post alert failed: $_" -ForegroundColor Red
}

# Test 7: Test Chat endpoint (uses new multi-provider LLM)
Write-Host "`nTEST 7: Chat with Multi-Provider LLM" -ForegroundColor Green
try {
  $body = @{ message = "How can I manage stress?" } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$baseUrl/chat" -Method POST -ContentType "application/json" -Body $body
  Write-Host "✅ Chat response received:" -ForegroundColor Green
  Write-Host "   Reply: $($resp.reply.Substring(0, [Math]::Min(100, $resp.reply.Length)))..." -ForegroundColor Cyan
} catch {
  Write-Host "❌ Chat failed: $_" -ForegroundColor Red
}

# Test 8: Test Summary endpoint (uses new multi-provider LLM)
Write-Host "`nTEST 8: Summary with Multi-Provider LLM" -ForegroundColor Green
try {
  $moodEntries = @(
    @{ mood = 3; stress = 4; timestamp = (Get-Date).AddDays(-2) },
    @{ mood = 4; stress = 3; timestamp = (Get-Date).AddDays(-1) },
    @{ mood = 4; stress = 2; timestamp = (Get-Date) }
  )
  $body = @{ entries = $moodEntries } | ConvertTo-Json
  $resp = Invoke-RestMethod -Uri "$baseUrl/summary" -Method POST -ContentType "application/json" -Body $body
  Write-Host "✅ Summary generated:" -ForegroundColor Green
  Write-Host "   Summary: $($resp.summary.Substring(0, [Math]::Min(100, $resp.summary.Length)))..." -ForegroundColor Cyan
} catch {
  Write-Host "❌ Summary failed: $_" -ForegroundColor Red
}

Write-Host "`n=== TESTS COMPLETE ===" -ForegroundColor Cyan
