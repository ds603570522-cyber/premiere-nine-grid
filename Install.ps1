param([switch]$FilesOnly)
$ErrorActionPreference = 'Stop'
$extensionId = 'com.meetavista.ninegrid'
$source = Join-Path $PSScriptRoot $extensionId
$parentDir = Join-Path $env:APPDATA 'Adobe\CEP\extensions'
$target = Join-Path $parentDir $extensionId
$registryPath = 'HKCU:\Software\Adobe\CSXS.12'
if ($FilesOnly) {
    $existingDebug=Get-ItemProperty -LiteralPath $registryPath -Name PlayerDebugMode -ErrorAction Stop
    if ($existingDebug.PlayerDebugMode -ne '1') { throw 'Files-only update requires the existing CEP loading setting. No settings were changed.' }
}
if (!(Test-Path -LiteralPath (Join-Path $source 'CSXS\manifest.xml'))) { throw 'Extension files missing. Extract the entire ZIP first.' }
$previousState = $null
$upgrading = Test-Path -LiteralPath $target
if ($upgrading) {
    if ((Get-Item -LiteralPath $target).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing to update a redirected folder.' }
    $oldManifest = [System.Xml.XmlDocument]::new()
    $oldManifest.Load((Join-Path $target 'CSXS\manifest.xml'))
    if ($oldManifest.ExtensionManifest.ExtensionBundleId -ne $extensionId) { throw 'Existing extension identity mismatch.' }
    $stateFile=Join-Path $target 'install-state.json'
    if (Test-Path -LiteralPath $stateFile) {
        $previousState=Get-Content -LiteralPath $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($previousState.id -ne $extensionId) { throw 'Installation state mismatch.' }
    }
    $backupParent=Join-Path $env:LOCALAPPDATA 'Meetavista\NineGridBackups'
    [IO.Directory]::CreateDirectory($backupParent) | Out-Null
    $backup=Join-Path $backupParent ([guid]::NewGuid().ToString())
    Copy-Item -LiteralPath $target -Destination $backup -Recurse
    Write-Host "Previous version backed up: $backup"
}
$state = @{ id=$extensionId; hadDebugValue=$false; oldDebugValue=$null; oldDebugKind=$null }
if (Test-Path -LiteralPath $registryPath) {
    $key = Get-Item -LiteralPath $registryPath
    if ($key.GetValueNames() -contains 'PlayerDebugMode') {
        $state.hadDebugValue=$true
        $state.oldDebugValue=$key.GetValue('PlayerDebugMode')
        $state.oldDebugKind=$key.GetValueKind('PlayerDebugMode').ToString()
    }
}
if ($previousState) { $state=$previousState }
[IO.Directory]::CreateDirectory($parentDir) | Out-Null
if ($upgrading) { Get-ChildItem -LiteralPath $source -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force } }
else { Copy-Item -LiteralPath $source -Destination $target -Recurse }
$state | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $target 'install-state.json') -Encoding UTF8
# Adobe's documented setting required to load locally developed unsigned CEP panels.
if (!$FilesOnly) {
    if (!(Test-Path -LiteralPath $registryPath)) { New-Item -Path $registryPath -Force | Out-Null }
    New-ItemProperty -LiteralPath $registryPath -Name 'PlayerDebugMode' -Value '1' -PropertyType String -Force | Out-Null
}
Write-Host 'Installed Nine Grid Assistant 1.1.1 for Premiere Pro 2025.' -ForegroundColor Green
if ($FilesOnly) { Write-Host 'Updated files only; registry settings unchanged.' } else { Write-Host 'Enabled unsigned local CEP 12 panels for the current Windows user.' }
Write-Host 'Restart Premiere. Open Window > Extensions > Nine Grid Assistant (Chinese menu name).'
Write-Host "Installed folder: $target"