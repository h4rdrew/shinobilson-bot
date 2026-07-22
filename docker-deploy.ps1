param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$')]
    [string]$Version
)

$ErrorActionPreference = "Stop"
$projectPath = (Resolve-Path -LiteralPath $PSScriptRoot).Path

Write-Host "Publicando a versão $Version pelo WSL..." -ForegroundColor Cyan
& wsl.exe --cd $projectPath bash ./scripts/docker-deploy.sh $Version

if ($LASTEXITCODE -ne 0) {
    throw "O deploy da versão $Version falhou com o código $LASTEXITCODE."
}
