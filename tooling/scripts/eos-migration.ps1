param(
    [switch]$Verify,
    [switch]$Commit,
    [switch]$Rollback,
    [switch]$Help
)

$ErrorActionPreference = 'Stop'

foreach ($arg in $args) {
    switch ($arg) {
        '--verify' { $Verify = $true }
        '--commit' { $Commit = $true }
        '--rollback' { $Rollback = $true }
        '--help' { $Help = $true }
        '-h' { $Help = $true }
    }
}

if ($Help -or (-not $Verify -and -not $Commit -and -not $Rollback)) {
    Write-Host "Usage:"
    Write-Host "  ./tooling/scripts/eos-migration.ps1 -Verify"
    Write-Host "  ./tooling/scripts/eos-migration.ps1 --verify"
    Write-Host "  ./tooling/scripts/eos-migration.ps1 -Commit"
    Write-Host "  ./tooling/scripts/eos-migration.ps1 --commit"
    Write-Host "  ./tooling/scripts/eos-migration.ps1 -Rollback"
    Write-Host "  ./tooling/scripts/eos-migration.ps1 --rollback"
    exit 0
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot '../..')
$repoRoot = $repoRoot.Path
$canonicalRoot = Join-Path $repoRoot '.ai'
$backupRoot = Join-Path $repoRoot 'migration-backup'
$verificationRoot = Join-Path $canonicalRoot 'verification'
$reportJson = Join-Path $verificationRoot 'eos_migration_report.json'
$reportMd = Join-Path $verificationRoot 'eos_migration_report.md'

if (-not (Test-Path $canonicalRoot)) {
    throw "Canonical .ai directory not found at $canonicalRoot"
}

New-Item -ItemType Directory -Path $verificationRoot -Force | Out-Null
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
    param([string]$BasePath, [string]$FullPath)
    $baseUri = [System.Uri]::new((Resolve-Path $BasePath).Path.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar)
    $fullUri = [System.Uri]::new((Resolve-Path $FullPath).Path)
    return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fullUri).ToString()).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function Get-FileHashString {
    param([string]$FilePath)
    return (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash
}

function Write-Report {
    param([object]$Summary)
    $Summary | ConvertTo-Json -Depth 6 | Set-Content -Path $reportJson -Encoding UTF8

    $lines = @(
        '# EOS Migration Report',
        '',
        "- Timestamp: $($Summary.Timestamp)",
        "- Mode: $($Summary.Mode)",
        "- Canonical root: $($Summary.CanonicalRoot)",
        ''
    )

    foreach ($result in $Summary.Results) {
        $lines += "## $($result.Source) -> $($result.Destination)"
        $lines += ""
        $lines += "- Copied: $($result.Copied.Count)"
        $lines += "- Skipped: $($result.Skipped.Count)"
        $lines += "- Conflicts: $($result.Conflicts.Count)"
        $lines += "- Duplicates: $($result.Duplicates.Count)"
        if ($result.Copied.Count -gt 0) {
            $lines += '- Copied files:'
            foreach ($item in $result.Copied) { $lines += "  - $item" }
        }
        if ($result.Skipped.Count -gt 0) {
            $lines += '- Skipped files:'
            foreach ($item in $result.Skipped) { $lines += "  - $item" }
        }
        if ($result.Conflicts.Count -gt 0) {
            $lines += '- Conflicts:'
            foreach ($item in $result.Conflicts) { $lines += "  - $item" }
        }
        $lines += ''
    }

    $lines | Set-Content -Path $reportMd -Encoding UTF8
}

function Invoke-Merge {
    param([bool]$IsCommit)

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
        Mode = if ($IsCommit) { 'commit' } else { 'verify' }
        Results = $results
        TotalCopied = @($results | ForEach-Object { $_.Copied.Count } | Measure-Object -Sum).Sum
        TotalSkipped = @($results | ForEach-Object { $_.Skipped.Count } | Measure-Object -Sum).Sum
        TotalConflicts = @($results | ForEach-Object { $_.Conflicts.Count } | Measure-Object -Sum).Sum
        TotalDuplicates = @($results | ForEach-Object { $_.Duplicates.Count } | Measure-Object -Sum).Sum
    }

    Write-Report -Summary $summary

    Write-Host "Reports written to $reportJson and $reportMd"
    Write-Host "Summary: copied=$($summary.TotalCopied), skipped=$($summary.TotalSkipped), conflicts=$($summary.TotalConflicts), duplicates=$($summary.TotalDuplicates)"

    if (-not $IsCommit) {
        Write-Host 'Verification only. No changes were made.'
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

    Write-Host 'Commit complete. Original folders preserved as backups.'
}

function Invoke-Rollback {
    $backupFolders = Get-ChildItem -LiteralPath $repoRoot -Directory | Where-Object { $_.Name -like '*_backup*' -and $_.Name -notlike 'migration-backup' }
    if (-not $backupFolders) {
        Write-Host 'No backup folders found to roll back.'
        return
    }

    foreach ($folder in $backupFolders) {
        $originalName = $folder.Name -replace '_backup(_\d+)?$', ''
        $targetPath = Join-Path $repoRoot $originalName
        if (Test-Path $targetPath) {
            Write-Host "Skipping $($folder.Name): target already exists"
            continue
        }
        Rename-Item -LiteralPath $folder.FullName -NewName $originalName
        Write-Host "Restored $($folder.Name) -> $originalName"
    }
}

if ($Rollback) {
    Invoke-Rollback
    return
}

if ($Commit) {
    Invoke-Merge -IsCommit $true
    return
}

Invoke-Merge -IsCommit $false
