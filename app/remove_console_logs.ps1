$files = Get-ChildItem -Path "c:\Users\Aakash\iCloudDrive\College work\Douglas College\Summer 2025\Special Topics in Emerging Technologies\Project\SilentAuction\app\screens" -Recurse -Filter "*.js"

foreach ($file in $files) {
    Write-Host "Processing $($file.FullName)"
    $content = Get-Content $file.FullName
    $newContent = $content | Where-Object { $_ -notmatch '\s*console\.(log|error|warn|info)\(' }
    $newContent | Set-Content $file.FullName
}

Write-Host "Console logs removed from all JavaScript files in screens folder"
