# Build and Preview Script (Development) for DeFi AI App
# Run with: \.\\buildScripts\\build-dev.ps1

Write-Host "Starting DeFi AI App DEV build..." -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

if (-not $env:ANDROID_HOME) {
    Write-Host "ANDROID_HOME is not set. Please install Android SDK." -ForegroundColor Red
    exit 1
}

Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "android\app\build\outputs\apk") {
    Remove-Item -Recurse -Force "android\app\build\outputs\apk\*" -ErrorAction SilentlyContinue
}

# Build debug APK
Write-Host "Compiling Android DEV APK (assembleDebug)..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow

Push-Location android
try {
    & .\gradlew.bat assembleDebug
    $buildSuccess = $LASTEXITCODE -eq 0
} finally {
    Pop-Location
}

if ($buildSuccess) {
    Write-Host "DEV build completed successfully!" -ForegroundColor Green

    $apkFolder = $null
    if (Test-Path "android\app\build\outputs\apk\debug") {
        $apkFolder = "android\app\build\outputs\apk\debug"
    } elseif (Test-Path "android\app\build\outputs\apk") {
        $apkFolder = "android\app\build\outputs\apk"
    }

    if ($null -ne $apkFolder) {
        Write-Host "Opening APK folder: $apkFolder" -ForegroundColor Green
        Start-Process explorer.exe -ArgumentList (Resolve-Path $apkFolder).Path
    } else {
        Write-Host "APK folder not found. Check your build configuration." -ForegroundColor Yellow
    }
} else {
    Write-Host "DEV build failed! Check the errors above." -ForegroundColor Red
    exit 1
}
