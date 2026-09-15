# PowerShell Cleanup Script for IndoctrinatedEdit
Write-Host "🧹 [IndoctrinatedEdit] Purging Chromium caches and AppData artifacts..." -ForegroundColor Cyan

# Terminate any lingering electron processes to release file locks
Get-Process -Name electron -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "🛑 Terminating lingering process: $($_.Id)" -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

$PathsToClean = @(
    "$env:APPDATA\indoctrinated-edit",
    "$env:APPDATA\IndoctrinatedEdit",
    "$env:LOCALAPPDATA\indoctrinated-edit",
    "$env:LOCALAPPDATA\IndoctrinatedEdit",
    "$env:LOCALAPPDATA\indoctrinated-edit-updater",
    "$env:LOCALAPPDATA\indoctrinatededit-updater",
    "$PSScriptRoot\..\node_modules\.vite",
    "$PSScriptRoot\..\dist",
    "$PSScriptRoot\..\dist-electron"
)

$CleanedCount = 0

foreach ($Path in $PathsToClean) {
    if (Test-Path $Path) {
        try {
            Write-Host "🗑️  Removing: $Path" -ForegroundColor Gray
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            Write-Host "   ✨ Purged: $(Split-Path $Path -Leaf)" -ForegroundColor Green
            $CleanedCount++
        } catch {
            Write-Host "   ⚠️  Could not remove $Path : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n🎉 [IndoctrinatedEdit] Cleanup complete! Purged $CleanedCount locations." -ForegroundColor Green
