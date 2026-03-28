# Build and Preview Script (Development) for DeFi AI App
# Run with: .\build-dev.ps1 from buildScripts directory

Write-Host "Starting DeFi AI App DEV build..." -ForegroundColor Green

# Navigate to project root
$scriptDir = $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
Push-Location $projectRoot

try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
        npm install
    }

    # Ensure Gradle child processes (cmd /c node ...) can always resolve Node on Windows.
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Write-Host "Node.js is not available in PATH. Install Node or fix PATH first." -ForegroundColor Red
        exit 1
    }
    $nodeExe = $nodeCmd.Source
    $nodeDir = Split-Path -Parent $nodeExe
    $requiredCmdPaths = @(
        $nodeDir,
        "$env:WINDIR\System32",
        "$env:WINDIR"
    )
    foreach ($pathEntry in $requiredCmdPaths) {
        if ($pathEntry -and -not ($env:Path -split ';' | Where-Object { $_ -eq $pathEntry })) {
            $env:Path = "$pathEntry;$env:Path"
        }
    }
    $env:NODE_BINARY = $nodeExe
    $env:ComSpec = "$env:WINDIR\System32\cmd.exe"

    if (-not $env:ANDROID_HOME) {
        Write-Host "Warning: ANDROID_HOME is not set. Build may fail." -ForegroundColor Yellow
    }

    Write-Host "`nCleaning previous builds..." -ForegroundColor Cyan
    if (Test-Path "android\app\build\outputs\apk") {
        Remove-Item -Recurse -Force "android\app\build\outputs\apk\*" -ErrorAction SilentlyContinue
    }

    # Build debug APK
    Write-Host "`nCompiling Android DEV APK (assembleDebug)..." -ForegroundColor Cyan
    Write-Host "This may take several minutes..." -ForegroundColor Yellow

    Push-Location android
    try {
        & .\gradlew.bat --stop | Out-Null
        if (Test-Path ".\gradlew.bat") {
            & .\gradlew.bat --no-daemon assembleDebug
        } else {
            & .\gradlew --no-daemon assembleDebug
        }
        $buildSuccess = $LASTEXITCODE -eq 0
    } finally {
        Pop-Location
    }

    if ($buildSuccess) {
        Write-Host "`n✅ DEV build completed successfully!" -ForegroundColor Green

        $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
        
        if (Test-Path $apkPath) {
            # Create output directory
            $outputDir = "buildScripts\output"
            New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
            
            # Copy APK with timestamp
            $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
            $outputName = "defi-ai-dev_$timestamp.apk"
            $outputPath = "$outputDir\$outputName"
            Copy-Item $apkPath $outputPath
            
            $fileSize = (Get-Item $outputPath).Length / 1MB
            Write-Host "APK saved to: $outputPath" -ForegroundColor Cyan
            Write-Host "File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
            
            # Open output folder
            Start-Process explorer.exe -ArgumentList (Resolve-Path $outputDir).Path
        } else {
            Write-Host "APK not found at expected location" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`n❌ DEV build failed! Check the errors above." -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}
