# AIOS Repository Scanner - PowerShell
# Recursively scan repository, classify files, detect issues

param(
    [string]$RepositoryRoot = (Get-Location).Path,
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Continue"

function Get-FileHash-Custom {
    param([string]$FilePath)
    try {
        $hash = Get-FileHash -Path $FilePath -Algorithm MD5 -ErrorAction SilentlyContinue
        return $hash.Hash
    } catch {
        return $null
    }
}

function Extract-MarkdownMetadata {
    param([string]$FilePath)
    
    $metadata = @{}
    try {
        $lines = Get-Content -Path $FilePath -Encoding UTF8 -ErrorAction SilentlyContinue | Select-Object -First 20
        
        foreach ($line in $lines) {
            if ($line -match "^# (.+)$") {
                $metadata["title"] = $Matches[1].Trim()
            }
        }
        
        $sectionCount = @(Get-Content -Path $FilePath -Encoding UTF8 | Where-Object { $_ -match "^#+\s" }).Count
        $metadata["sections"] = $sectionCount
    } catch {
        # Silent fail
    }
    
    return $metadata
}

function Extract-References {
    param([string]$FilePath)
    
    $references = @()
    try {
        $content = Get-Content -Path $FilePath -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        
        # Markdown links
        $links = [regex]::Matches($content, '\[([^\]]+)\]\(([^\)]+)\)')
        foreach ($match in $links) {
            $references += $match.Groups[2].Value
        }
    } catch {
        # Silent fail
    }
    
    return @($references | Sort-Object -Unique)
}

function Scan-Repository {
    param([string]$RepositoryRoot)
    
    Write-Host "[SCAN] Starting repository scan: $RepositoryRoot"
    
    $index = @{
        schemaVersion = "0.1.0"
        status = "generated"
        updated = (Get-Date -Format "o")
        repositoryRoot = $RepositoryRoot
        summary = @{
            totalFiles = 0
            totalDirectories = 0
            totalSize = 0
            fileTypes = @{}
            emptyDirectories = @()
            duplicateFiles = @()
            brokenReferences = @()
            orphanDocuments = @()
        }
        data = @{
            repositories = @($RepositoryRoot)
            directories = @()
            files = @()
            fileTypes = @{}
            metadata = @{}
        }
    }
    
    $filesByHash = @{}
    $allReferences = @()
    $existingFiles = @()
    
    # Scan all files
    $allItems = Get-ChildItem -Path $RepositoryRoot -Recurse -Force -ErrorAction SilentlyContinue | 
                Where-Object { $_.FullName -notmatch '\\\.git\\' -and $_.FullName -notmatch '\\node_modules\\' }
    
    $directories = @($allItems | Where-Object { $_.PSIsContainer })
    $files = @($allItems | Where-Object { -not $_.PSIsContainer })
    
    Write-Host "[SCAN] Found $($files.Count) files in $($directories.Count) directories"
    
    # Process directories
    foreach ($dir in $directories) {
        $relPath = $dir.FullName.Substring($RepositoryRoot.Length).TrimStart('\').Replace('\', '/')
        
        if ($relPath) {
            $childItems = @(Get-ChildItem -Path $dir.FullName -ErrorAction SilentlyContinue)
            $childFiles = @($childItems | Where-Object { -not $_.PSIsContainer })
            $childDirs = @($childItems | Where-Object { $_.PSIsContainer })
            
            $index.data.directories += @{
                path = $relPath
                name = $dir.Name
                fileCount = $childFiles.Count
                subdirectoryCount = $childDirs.Count
            }
            
            $index.summary.totalDirectories += 1
            
            # Check for empty directories
            if ($childFiles.Count -eq 0 -and $childDirs.Count -eq 0) {
                $index.summary.emptyDirectories += $relPath
            }
        }
    }
    
    # Process files
    foreach ($file in $files) {
        $relPath = $file.FullName.Substring($RepositoryRoot.Length).TrimStart('\').Replace('\', '/')
        $ext = $file.Extension.ToLower()
        if (-not $ext) { $ext = "no_extension" }
        
        $fileInfo = @{
            path = $relPath
            name = $file.Name
            extension = $ext
            size = $file.Length
            modified = $file.LastWriteTime.ToUniversalTime().ToString("o")
            type = "file"
            metadata = @{}
        }
        
        # Calculate hash
        $fileHash = Get-FileHash-Custom -FilePath $file.FullName
        if ($fileHash) {
            $fileInfo.checksum = $fileHash
            
            # Track duplicates
            if ($filesByHash.ContainsKey($fileHash)) {
                $filesByHash[$fileHash] += @($relPath)
            } else {
                $filesByHash[$fileHash] = @($relPath)
            }
        }
        
        # Extract references and metadata
        if ($ext -in @(".md", ".yaml", ".yml", ".json")) {
            $fileInfo.references = Extract-References -FilePath $file.FullName
            $allReferences += $fileInfo.references
            
            if ($ext -eq ".md") {
                $fileInfo.type = "markdown"
                $fileInfo.metadata = Extract-MarkdownMetadata -FilePath $file.FullName
            } elseif ($ext -in @(".yaml", ".yml")) {
                $fileInfo.type = "yaml"
                $fileInfo.metadata = @{ format = "yaml" }
            } elseif ($ext -eq ".json") {
                $fileInfo.type = "json"
                $fileInfo.metadata = @{ format = "json" }
            }
        } elseif ($ext -in @(".ps1", ".py")) {
            $fileInfo.type = "script"
            $fileInfo.metadata = @{ executable = $true }
        }
        
        $index.data.files += $fileInfo
        $existingFiles += $relPath
        
        $index.summary.totalFiles += 1
        $index.summary.totalSize += $file.Length
        
        # Track file type
        if (-not $index.summary.fileTypes.ContainsKey($ext)) {
            $index.summary.fileTypes[$ext] = 0
            $index.data.fileTypes[$ext] = @()
        }
        $index.summary.fileTypes[$ext] += 1
        $index.data.fileTypes[$ext] += $relPath
    }
    
    # Detect duplicates
    foreach ($hash in $filesByHash.Keys) {
        if ($filesByHash[$hash].Count -gt 1) {
            $index.summary.duplicateFiles += @{
                hash = $hash
                files = @($filesByHash[$hash])
            }
        }
    }
    
    Write-Host "[DETECT] Found $($index.summary.duplicateFiles.Count) duplicate file groups"
    Write-Host "[DETECT] Found $($index.summary.emptyDirectories.Count) empty directories"
    
    return $index
}

# Main execution
if (-not $OutputPath) {
    $OutputPath = Join-Path $RepositoryRoot ".ai" "index" "repository-index.json"
}

$index = Scan-Repository -RepositoryRoot $RepositoryRoot

# Ensure output directory exists
$outputDir = Split-Path -Parent $OutputPath
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force -ErrorAction SilentlyContinue | Out-Null
}

# Save index
$index | ConvertTo-Json -Depth 10 | Set-Content -Path $OutputPath -Encoding UTF8

Write-Host "[SUCCESS] Repository scan complete"
Write-Host "[SAVE] Repository index saved to $OutputPath"
Write-Host ($index.summary | ConvertTo-Json -Depth 5)
