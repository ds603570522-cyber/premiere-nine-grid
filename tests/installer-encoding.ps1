$ErrorActionPreference='Stop'
$base=Split-Path -Parent $PSScriptRoot
$testDir=Join-Path $PSScriptRoot 'encoding-fixtures'
[IO.Directory]::CreateDirectory($testDir)|Out-Null
$xmlText='<?xml version="1.0" encoding="UTF-8"?><ExtensionManifest ExtensionBundleId="com.meetavista.ninegrid" ExtensionBundleName="九宫格助手"><Menu>九宫格助手</Menu></ExtensionManifest>'
foreach($bom in @($false,$true)) {
    $file=Join-Path $testDir ('manifest-'+$bom+'.xml')
    [IO.File]::WriteAllText($file,$xmlText,[Text.UTF8Encoding]::new($bom))
    $doc=[System.Xml.XmlDocument]::new();$doc.Load($file)
    if($doc.ExtensionManifest.ExtensionBundleName -cne '九宫格助手' -or $doc.ExtensionManifest.Menu -cne '九宫格助手'){throw 'Chinese XML decoding failed'}
    Write-Output ('PASS UTF-8 manifest, BOM='+$bom)
}
foreach($name in @('Install.ps1','Uninstall.ps1')) {
    $file=Join-Path $base $name
    $tokens=$null;$parseErrors=$null
    [System.Management.Automation.Language.Parser]::ParseFile($file,[ref]$tokens,[ref]$parseErrors)|Out-Null
    if($parseErrors.Count){throw ($parseErrors|Out-String)}
    $text=[IO.File]::ReadAllText($file)
    if($text -match '\[xml\].*Get-Content'){throw 'Unsafe locale-dependent XML decoding remains'}
    if($text -notmatch '\.Load\(\(Join-Path \$target'){throw 'XML parser load missing'}
    Write-Output ('PASS script syntax and XML read strategy: '+$name)
}
Write-Output ('Runtime: Windows PowerShell '+$PSVersionTable.PSVersion)