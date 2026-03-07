# scrape_prices.ps1 — Fetches TCGPlayer prices for Sorcery: Contested Realm
# and writes public/prices.json

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot   = Split-Path -Parent $ScriptDir
$CardsJson  = Join-Path $ScriptDir "cards.json"
$OutputPath = Join-Path $RepoRoot "public\prices.json"

$ApiUrl   = "https://mp-search-api.tcgplayer.com/v1/search/request"
$PageSize = 50

$Headers = @{
    "Content-Type" = "application/json"
    "Accept"       = "application/json"
}

# Load card database
Write-Host "Loading card database..."
$cards = Get-Content $CardsJson -Raw | ConvertFrom-Json
Write-Host "Loaded $($cards.Count) cards"

# Build slug index: "name|setname|finish" -> slug
$slugIndex = @{}
foreach ($card in $cards) {
    $nameLower = $card.name.ToLower().Trim()
    foreach ($s in $card.sets) {
        $setLower = $s.n.ToLower()
        foreach ($v in $s.v) {
            $key = "$nameLower|$setLower|$($v.finish.ToLower())"
            $slugIndex[$key] = $v.slug
        }
    }
}
Write-Host "Built slug index with $($slugIndex.Count) entries"

# Fetch all products from API
Write-Host "Fetching page 1..."
$body = @{
    algorithm = "sales_synonym_v2"
    from      = 0
    size      = $PageSize
    filters   = @{ term = @{ productLineName = @("Sorcery Contested Realm") } }
    listingSearch = @{ filters = @{ range = @{ quantity = @{ gte = 1 } } } }
    context   = @{ shippingCountry = "US" }
} | ConvertTo-Json -Depth 10

$response    = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $Headers -Body $body
$total       = $response.results.totalResults
$totalPages  = [math]::Ceiling($total / $PageSize)
$allProducts = $response.results.results

Write-Host "Total products: $total across $totalPages pages"

for ($page = 1; $page -lt $totalPages; $page++) {
    Write-Host "Fetching page $($page + 1) / $totalPages..."
    $body = @{
        algorithm = "sales_synonym_v2"
        from      = $page * $PageSize
        size      = $PageSize
        filters   = @{ term = @{ productLineName = @("Sorcery Contested Realm") } }
        listingSearch = @{ filters = @{ range = @{ quantity = @{ gte = 1 } } } }
        context   = @{ shippingCountry = "US" }
    } | ConvertTo-Json -Depth 10
    $response     = Invoke-RestMethod -Uri $ApiUrl -Method Post -Headers $Headers -Body $body
    $allProducts += $response.results.results
    Start-Sleep -Milliseconds 500
}

Write-Host "Fetched $($allProducts.Count) total products"

# Match products to slugs
$prices  = @{}
$exact   = 0
$skipped = 0

foreach ($product in $allProducts) {
    $rawName = $product.productName
    $setName = $product.setName
    $market  = $product.marketPrice
    $lowest  = $product.lowestPrice

    if (-not $rawName -or $market -eq $null) { continue }

    # Detect finish
    $nameLower = $rawName.ToLower()
    if ($nameLower -match "rainbow foil") { $finish = "rainbow" }
    elseif ($nameLower -match "foil")     { $finish = "foil" }
    else                                  { $finish = "standard" }

    # Clean name - remove parenthetical suffixes and trailing foil
    $clean = $rawName -replace '\s*\([^)]*\)', '' 
    $clean = $clean -replace '\s*(rainbow foil|foil)\s*$', '' -replace '^\s+|\s+$', ''

    $key  = "$($clean.ToLower().Trim())|$($setName.ToLower().Trim())|$finish"
    $slug = $slugIndex[$key]

    if ($slug) {
        $prices[$slug] = @{ market = $market; low = $lowest }
        $exact++
    } else {
        $skipped++
    }
}

Write-Host "Results: $exact matched, $skipped skipped"

# Write prices.json
$output = @{
    updated   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    source    = "TCGPlayer"
    sourceUrl = "https://www.tcgplayer.com/categories/trading-and-collectible-card-games/sorcery-contested-realm/price-guides"
    prices    = $prices
}

$output | ConvertTo-Json -Depth 5 | Set-Content -Path $OutputPath -Encoding UTF8
Write-Host "Wrote $($prices.Count) price entries to $OutputPath"
