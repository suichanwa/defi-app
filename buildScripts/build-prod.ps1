# Build Script (Production) for DeFi AI App
# Run with: \.\\buildScripts\\build-prod.ps1

Write-Host "Starting DeFi AI App Build Process..." -ForegroundColor Cyan

# Navigate to project root (script runs from buildScripts)
$scriptDir = $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
Push-Location $projectRoot

try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        npm install
    }

    if (-not $env:ANDROID_HOME) {
        Write-Host "ANDROID_HOME is not set. Please install Android SDK." -ForegroundColor Red
        exit 1
    }

    # Clean previous builds
    Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
    if (Test-Path "android\app\build\outputs\apk") {
        Remove-Item -Recurse -Force "android\app\build\outputs\apk\*"
    }

    # Build the Android app using gradlew directly
    Write-Host "Compiling Android application..." -ForegroundColor Yellow
    Write-Host "This may take several minutes..." -ForegroundColor Yellow

    Push-Location (Join-Path $projectRoot "android")
    try {
        & .\gradlew.bat assembleRelease
        $buildSuccess = $LASTEXITCODE -eq 0
    } finally {
        Pop-Location
    }

    # Check if build was successful
    if ($buildSuccess) {
        Write-Host "Build completed successfully!" -ForegroundColor Green
        
        # Determine which folder to open based on what exists
        $releaseFolder = $null
        
        if (Test-Path "android\app\build\outputs\apk\release") {
            $releaseFolder = "android\app\build\outputs\apk\release"
        }
        elseif (Test-Path "android\app\build\outputs\apk\debug") {
            $releaseFolder = "android\app\build\outputs\apk\debug"
        }
        elseif (Test-Path "android\app\build\outputs\apk") {
            $releaseFolder = "android\app\build\outputs\apk"
        }
        
        if ($null -ne $releaseFolder) {
            Write-Host "Opening APK folder: $releaseFolder" -ForegroundColor Green
            Start-Process explorer.exe -ArgumentList (Resolve-Path $releaseFolder).Path
            Write-Host "Done! Explorer opened with your APK files." -ForegroundColor Green
        }
        else {
            Write-Host "APK folder not found. Check your build configuration." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "Build failed! Check the errors above." -ForegroundColor Red
        Write-Host "Make sure Android SDK is properly configured." -ForegroundColor Yellow
        exit 1
    }
} finally {
    Pop-Location
}
