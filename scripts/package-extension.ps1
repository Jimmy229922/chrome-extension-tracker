$ErrorActionPreference = 'Stop'

$zipName = 'account-copy-tracker-extension.zip'
$excludeNames = @('.git', '.vscode', 'backend', $zipName)

if (Test-Path $zipName) {
  Remove-Item $zipName -Force
}

$items = Get-ChildItem -Force | Where-Object { $excludeNames -notcontains $_.Name }
if (-not $items) {
  throw 'No files found to package.'
}

Compress-Archive -Path $items.FullName -DestinationPath $zipName -Force
Write-Output "Created: $zipName"
