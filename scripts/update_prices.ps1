# update_prices.ps1 — Daily price update script for CardScribe
# Run via Windows Task Scheduler

$RepoPath = "D:\GitHub\CardScribe"
$LogFile  = "$RepoPath\scripts\update_prices.log"
$MaxLogLines = 500

function Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

# Trim log file if too long
if (Test-Path $LogFile) {
    $lines = Get-Content $LogFile
    if ($lines.Count -gt $MaxLogLines) {
        $lines | Select-Object -Last $MaxLogLines | Set-Content $LogFile
    }
}

Log "── Starting price update ──"

# Navigate to repo
Set-Location $RepoPath

# Pull latest changes first
Log "Pulling latest from origin..."
$pull = git pull 2>&1
Log "git pull: $pull"

# Run scraper
Log "Running scraper..."
$result = python scripts/scrape_prices.py --live 2>&1
Log $result

# Check if prices.json was updated
$status = git status --porcelain public/prices.json
if ($status) {
    Log "prices.json updated — committing..."
    git add public/prices.json
    $date = Get-Date -Format 'yyyy-MM-dd'
    git commit -m "chore: update prices $date"
    $push = git push 2>&1
    Log "git push: $push"
    Log "✓ Price update complete"
} else {
    Log "No changes to prices.json — skipping commit"
}

Log "── Done ──"
