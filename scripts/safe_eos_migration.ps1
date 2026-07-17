param(
    [switch]$Commit
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
$repoRoot = $repoRoot.Path
$canonicalRoot = Join-Path $repoRoot '.ai'

if (-not (Test-Path $canonicalRoot)) {
    throw "Canonical .ai directory not found at $canonicalRoot"
}

$verificationDir = Join-Path $canonicalRoot 'verification'
New-Item -ItemType Directory -Path $verificationDir -Force | Out-Null

$reportPath = Join-Path $verificationDir 'eos_migration_report.json'
$reportTextPath = Join-Path $verificationDir 'eos_migration_report.txt'
$backupRoot = Join-Path $repoRoot 'migration-backup'
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$mapping = @(
    @{ Source = 'framework'; Destination = '.ai' },
    @{ Source = 'project'; Destination = '.ai' },
    @{ Source = 'checklists'; Destination = '.ai/checklists' },
    @{ Source = 'knowledge'; Destination = '.ai/knowledge' },
    @{ Source = 'prompts'; Destination = '.ai/prompts' },
    @{ Source = 'reports'; Destination = '.ai/reports' },
    @{ Source = 'verification'; Destination = '.ai/verification' }
)

function Get-RelativePath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $baseUri = [System.Uri]::new((Resolve-Path $BasePath).Path.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar)
    $fullUri = [System.Uri]::new((Resolve-Path $FullPath).Path)
    return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fullUri).ToString()).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function Get-FileHashString {
    param([string]$FilePath)
    return (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash
}

$results = @()

foreach ($entry in $mapping) {
    $sourcePath = Join-Path $repoRoot $entry.Source
    $destinationPath = Join-Path $repoRoot $entry.Destination

    if (-not (Test-Path $sourcePath)) {
        continue
    }

    New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null

    $copied = New-Object System.Collections.Generic.List[string]
    $skipped = New-Object System.Collections.Generic.List[string]
    $conflicts = New-Object System.Collections.Generic.List[string]
    $duplicates = New-Object System.Collections.Generic.List[string]

    $sourceFiles = Get-ChildItem -LiteralPath $sourcePath -Recurse -File

    foreach ($sourceFile in $sourceFiles) {
        $relativePath = Get-RelativePath -BasePath $sourcePath -FullPath $sourceFile.FullName
        $targetPath = Join-Path $destinationPath $relativePath
        $targetParent = Split-Path -Parent $targetPath
        New-Item -ItemType Directory -Path $targetParent -Force | Out-Null

        if (Test-Path $targetPath) {
            $targetHash = Get-FileHashString -FilePath $targetPath
            $sourceHash = Get-FileHashString -FilePath $sourceFile.FullName
            if ($targetHash -eq $sourceHash) {
                $skipped.Add($relativePath)
                $duplicates.Add($relativePath)
            }
            else {
                $conflicts.Add($relativePath)
            }
            continue
        }

        Copy-Item -LiteralPath $sourceFile.FullName -Destination $targetPath -Force
        $copied.Add($relativePath)
    }

    $results += [pscustomobject]@{
        Source = $entry.Source
        Destination = $entry.Destination
        Copied = @($copied)
        Skipped = @($skipped)
        Conflicts = @($conflicts)
        Duplicates = @($duplicates)
    }
}

$summary = [pscustomobject]@{
    Timestamp = (Get-Date).ToString('o')
    CanonicalRoot = '.ai'
    Mode = if ($Commit) { 'commit' } else { 'verify-only' }
    Results = $results
    TotalCopied = ($results | Measure-Object -Property Copied -Sum).Sum
    TotalSkipped = ($results | Measure-Object -Property Skipped -Sum).Sum
    TotalConflicts = ($results | Measure-Object -Property Conflicts -Sum).Sum
    TotalDuplicates = ($results | Measure-Object -Property Duplicates -Sum).Sum
}

$summary | ConvertTo-Json -Depth 6 | Set-Content -Path $reportPath -Encoding UTF8

$lines = @(
    'EOS migration verification report',
    '================================',
    "Timestamp: $($summary.Timestamp)",
    "Mode: $($summary.Mode)",
    "Canonical root: .ai",
    ''
)

foreach ($result in $results) {
    $lines += "Source: $($result.Source) -> $($result.Destination)"
    $lines += "  Copied: $($result.Copied.Count)"
    $lines += "  Skipped: $($result.Skipped.Count)"
    $lines += "  Conflicts: $($result.Conflicts.Count)"
    $lines += "  Duplicates: $($result.Duplicates.Count)"
    if ($result.Copied.Count -gt 0) { $lines += '  Copied files:'; foreach ($item in $result.Copied) { $lines += "    - $item" } }
    if ($result.Skipped.Count -gt 0) { $lines += '  Skipped files:'; foreach ($item in $result.Skipped) { $lines += "    - $item" } }
    if ($result.Conflicts.Count -gt 0) { $lines += '  Conflicts:'; foreach ($item in $result.Conflicts) { $lines += "    - $item" } }
    $lines += ''
}

$lines | Set-Content -Path $reportTextPath -Encoding UTF8

if (-not $Commit) {
    $lines += 'No deletions were performed. Review the report and rename the original folders manually when ready.'
    $lines | Set-Content -Path $reportTextPath -Encoding UTF8
}

Write-Host "Migration report written to $reportPath"
Write-Host "Verification summary: copied=$($summary.TotalCopied), skipped=$($summary.TotalSkipped), conflicts=$($summary.TotalConflicts), duplicates=$($summary.TotalDuplicates)"

if (-not $Commit) {
    Write-Host 'Safe mode: no folders were deleted.'
    return
}

foreach ($entry in $mapping) {
    $sourcePath = Join-Path $repoRoot $entry.Source
    if (-not (Test-Path $sourcePath)) {
        continue
    }

    $backupName = $entry.Source + '_backup'
    $backupPath = Join-Path $repoRoot $backupName
    $counter = 1
    while (Test-Path $backupPath) {
        $backupName = $entry.Source + "_backup_$counter"
        $backupPath = Join-Path $repoRoot $backupName
        $counter++
    }

    Rename-Item -LiteralPath $sourcePath -NewName $backupName
    Write-Host "Renamed $($entry.Source) -> $backupName"
}

Write-Host 'Migration complete. Original folders were preserved as backup names.'
