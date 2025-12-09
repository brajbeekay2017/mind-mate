#!/usr/bin/env pwsh
# Enhanced Recovery & Recommendations Test Suite
# Tests the newly enhanced content and UI features

$baseURL = "http://localhost:4000"
$passed = 0
$failed = 0

function Test-Endpoint {
    param(
        [string]$name,
        [string]$method,
        [string]$endpoint,
        [object]$body
    )
    
    Write-Host "Testing: $name..." -ForegroundColor Cyan
    try {
        $params = @{
            Uri = "$baseURL$endpoint"
            Method = $method
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        
        if ($body) {
            $params.Body = $body | ConvertTo-Json -Depth 10
        }
        
        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ PASS: $name" -ForegroundColor Green
            $content = $response.Content | ConvertFrom-Json
            
            # Display content preview
            if ($content.challengeName) {
                Write-Host "   Challenge: $($content.challengeName)" -ForegroundColor Gray
                Write-Host "   Days: $($content.days.Count)" -ForegroundColor Gray
                Write-Host "   Expected Reduction: $($content.totalExpectedReduction)%" -ForegroundColor Gray
                Write-Host "   Tips: $($content.tips.Count)" -ForegroundColor Gray
            }
            elseif ($content.recommendations) {
                Write-Host "   Recommendations: $($content.recommendations.Count)" -ForegroundColor Gray
                Write-Host "   Categories: $(($content.recommendations | Select-Object -ExpandProperty category -Unique) -join ', ')" -ForegroundColor Gray
            }
            
            $script:passed++
            return $true
        } else {
            Write-Host "❌ FAIL: $name - Status $($response.StatusCode)" -ForegroundColor Red
            $script:failed++
            return $false
        }
    }
    catch {
        Write-Host "❌ FAIL: $name - $($_.Exception.Message)" -ForegroundColor Red
        $script:failed++
        return $false
    }
}

Write-Host "`n==============================" -ForegroundColor Cyan
Write-Host "Enhanced Recovery & Recommendations Tests" -ForegroundColor Cyan
Write-Host "==============================`n" -ForegroundColor Cyan

# Test 1: Health Check
Test-Endpoint -name "Backend Health" -method "GET" -endpoint "/health"

# Test 2: Generate Recovery Challenge
$recoveryPayload = @{
    userId = "test-user-1"
    moodHistory = @(
        @{ mood = 3; stress = 4; timestamp = (Get-Date).AddDays(-5).ToIso8601String() }
        @{ mood = 2; stress = 5; timestamp = (Get-Date).AddDays(-3).ToIso8601String() }
        @{ mood = 3; stress = 4; timestamp = (Get-Date).ToIso8601String() }
    )
}
Test-Endpoint -name "Generate Recovery Challenge (AI)" -method "POST" -endpoint "/stress-recovery/generate" -body $recoveryPayload

# Test 3: Generate Recommendations
$recsPayload = @{
    userId = "test-user-2"
    moodHistory = @(
        @{ mood = 3; stress = 4; timestamp = (Get-Date).AddDays(-7).ToIso8601String() }
        @{ mood = 2; stress = 5; timestamp = (Get-Date).AddDays(-5).ToIso8601String() }
        @{ mood = 3; stress = 4; timestamp = (Get-Date).ToIso8601String() }
    )
}
Test-Endpoint -name "Generate Recommendations (AI)" -method "POST" -endpoint "/recommendations/generate" -body $recsPayload

# Test 4: Verify Recovery Challenge Fields
Write-Host "`nVerifying Enhanced Recovery Challenge Fields..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseURL/stress-recovery/generate" -Method POST -ContentType "application/json" -Body ($recoveryPayload | ConvertTo-Json -Depth 10)
    $data = $response.Content | ConvertFrom-Json
    
    $requiredFields = @('challengeName', 'difficulty', 'description', 'overview', 'days', 'totalExpectedReduction', 'successRate', 'tips', 'followUp')
    $missingFields = @()
    
    foreach ($field in $requiredFields) {
        if (-not $data.$field) {
            $missingFields += $field
        }
    }
    
    if ($missingFields.Count -eq 0) {
        Write-Host "✅ All required fields present:" -ForegroundColor Green
        foreach ($field in $requiredFields) {
            Write-Host "   ✓ $field" -ForegroundColor Green
        }
        $script:passed++
    } else {
        Write-Host "❌ Missing fields: $($missingFields -join ', ')" -ForegroundColor Red
        $script:failed++
    }
    
    # Check day structure
    if ($data.days -and $data.days.Count -eq 3) {
        Write-Host "✅ Challenge has 3 days" -ForegroundColor Green
        $script:passed++
        
        # Check each day has required structure
        $dayValid = $true
        foreach ($day in $data.days) {
            if (-not $day.tasks -or $day.tasks.Count -eq 0) {
                $dayValid = $false
                break
            }
            foreach ($task in $day.tasks) {
                if (-not $task.steps -or $task.steps.Count -eq 0) {
                    $dayValid = $false
                    break
                }
            }
        }
        
        if ($dayValid) {
            Write-Host "✅ All days have tasks with steps" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "❌ Day structure incomplete" -ForegroundColor Red
            $script:failed++
        }
    } else {
        Write-Host "❌ Challenge should have 3 days" -ForegroundColor Red
        $script:failed++
    }
}
catch {
    Write-Host "❌ Error verifying fields: $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
}

# Test 5: Verify Recommendations Fields
Write-Host "`nVerifying Enhanced Recommendations Fields..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseURL/recommendations/generate" -Method POST -ContentType "application/json" -Body ($recsPayload | ConvertTo-Json -Depth 10)
    $data = $response.Content | ConvertFrom-Json
    
    $recommendationCount = ($data.recommendations | Measure-Object).Count
    if ($recommendationCount -ge 5) {
        Write-Host "✅ At least 5 recommendations generated ($recommendationCount)" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "❌ Expected at least 5 recommendations, got $recommendationCount" -ForegroundColor Red
        $script:failed++
    }
    
    # Check recommendation structure
    $hasAllFields = $true
    $categories = @()
    foreach ($rec in $data.recommendations) {
        if (-not $rec.title -or -not $rec.description -or -not $rec.technique) {
            $hasAllFields = $false
            break
        }
        if ($rec.category) {
            $categories += $rec.category
        }
    }
    
    if ($hasAllFields) {
        Write-Host "✅ All recommendations have required fields (title, description, technique)" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "❌ Some recommendations missing required fields" -ForegroundColor Red
        $script:failed++
    }
    
    $uniqueCategories = $categories | Select-Object -Unique
    Write-Host "✅ Recommendation categories: $($uniqueCategories -join ', ')" -ForegroundColor Green
    $script:passed++
    
    # Check for nextSteps
    if ($data.nextSteps -and $data.nextSteps.Count -ge 4) {
        Write-Host "✅ Next steps provided ($($data.nextSteps.Count) steps)" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "⚠️ Next steps missing or incomplete" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Error verifying recommendations: $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
}

# Summary
Write-Host "`n==============================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "Total: $($passed + $failed)`n" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "🎉 All tests passed! Enhancements are working correctly." -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️ Some tests failed. Please review the output above." -ForegroundColor Red
    exit 1
}
