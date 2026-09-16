# PowerShell Cleanup Script for IndoctrinatedEdit
Write-Host "[IndoctrinatedEdit] Purging Chromium caches, AppData artifacts, and Registry entries..." -ForegroundColor Cyan

# Terminate any lingering electron or IndoctrinatedEdit processes to release file locks
Get-Process -Name "electron", "IndoctrinatedEdit", "indoctrinated-edit" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Terminating lingering process: $($_.ProcessName) ($($_.Id))" -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

$PathsToClean = @(
    "$env:APPDATA\indoctrinated-edit",
    "$env:APPDATA\IndoctrinatedEdit",
    "$env:LOCALAPPDATA\indoctrinated-edit",
    "$env:LOCALAPPDATA\IndoctrinatedEdit",
    "$env:LOCALAPPDATA\indoctrinated-edit-updater",
    "$env:LOCALAPPDATA\indoctrinatededit-updater",
    "$PSScriptRoot\..\node_modules\.vite"
)

$CleanedCount = 0

foreach ($Path in $PathsToClean) {
    if (Test-Path $Path) {
        try {
            Write-Host "Removing: $Path" -ForegroundColor Gray
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            Write-Host "Purged: $(Split-Path $Path -Leaf)" -ForegroundColor Green
            $CleanedCount++
        } catch {
            Write-Host "Could not remove $Path : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Clean registry keys if any exist
$RegistryKeysToClean = @(
    "HKCU:\Software\indoctrinated-edit",
    "HKCU:\Software\IndoctrinatedEdit",
    "HKCU:\Software\Classes\indoctrinated-edit",
    "HKCU:\Software\Classes\IndoctrinatedEdit"
)

foreach ($RegKey in $RegistryKeysToClean) {
    if (Test-Path $RegKey) {
        try {
            Write-Host "Removing Registry Key: $RegKey" -ForegroundColor Gray
            Remove-Item -Path $RegKey -Recurse -Force -ErrorAction Stop
            Write-Host "Removed Registry Key: $RegKey" -ForegroundColor Green
            $CleanedCount++
        } catch {
            Write-Host "Could not remove registry key $RegKey : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n[IndoctrinatedEdit] Cleanup complete! Purged $CleanedCount locations and registry keys." -ForegroundColor Green
