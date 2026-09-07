$ErrorActionPreference = 'Stop'
$extensionId = 'com.meetavista.ninegrid'
$parentDir = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'Adobe\CEP\extensions'))
$target = [IO.Path]::GetFullPath((Join-Path $parentDir $extensionId))
if ([IO.Path]::GetDirectoryName($target) -ne $parentDir -or [IO.Path]::GetFileName($target) -ne $extensionId) { throw 'Unexpected removal path.' }
if (!(Test-Path -LiteralPath $target)) { Write-Host 'Not installed.'; exit 0 }
$folder = Get-Item -LiteralPath $target
if ($folder.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing to remove a redirected folder.' }
$manifest = [System.Xml.XmlDocument]::new()
$manifest.Load((Join-Path $target 'CSXS\manifest.xml'))
if ($manifest.ExtensionManifest.ExtensionBundleId -ne $extensionId) { throw 'Extension identity mismatch.' }
$statePath=Join-Path $target 'install-state.json'
if (Test-Path -LiteralPath $statePath) {
    $state=Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $registryPath='HKCU:\Software\Adobe\CSXS.12'
    $now=Get-ItemProperty -LiteralPath $registryPath -Name PlayerDebugMode -ErrorAction SilentlyContinue
    if ($now.PlayerDebugMode -eq '1' -and $state.id -eq $extensionId) {
        if ($state.hadDebugValue) { New-ItemProperty -LiteralPath $registryPath -Name PlayerDebugMode -Value $state.oldDebugValue -PropertyType $state.oldDebugKind -Force | Out-Null }
        else { Remove-ItemProperty -LiteralPath $registryPath -Name PlayerDebugMode }
    }
}
Remove-Item -LiteralPath $target -Recurse
Write-Host 'Removed Nine Grid Assistant and restored the previous CEP debug value where unchanged. Restart Premiere.'