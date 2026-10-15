param(
    [string]$StlRoot = '\\IBFNAS\Preston\3DModels\rc_CatDumpTruck\STL',
    [string]$ProjectRoot = '\\IBFNAS\Preston\BambuProjects\RC_DumpTruck'
)
$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$partEntries = Get-Content -LiteralPath (Join-Path $repositoryRoot 'config\parts.json') -Raw | ConvertFrom-Json
$projectEntries = Get-Content -LiteralPath (Join-Path $repositoryRoot 'config\projects.json') -Raw | ConvertFrom-Json
$partDestination = Join-Path $repositoryRoot 'local-inputs\stl-current'
$projectDestination = Join-Path $repositoryRoot 'local-inputs\projects'
New-Item -ItemType Directory -Force -Path $partDestination,$projectDestination | Out-Null
foreach ($entry in $partEntries) {
    $sourceFile = Join-Path $StlRoot $entry.source
    $destinationFile = Join-Path $partDestination $entry.source
    if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) { Write-Warning "Missing part: $($entry.source)"; continue }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destinationFile) | Out-Null
    Copy-Item -LiteralPath $sourceFile -Destination $destinationFile
}
foreach ($entry in $projectEntries) {
    $sourceFile = Join-Path $ProjectRoot $entry.filename
    if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) { Write-Warning "Missing project: $($entry.filename)"; continue }
    Copy-Item -LiteralPath $sourceFile -Destination $projectDestination
}
Write-Output 'Working copies refreshed. Source files were only read.'
