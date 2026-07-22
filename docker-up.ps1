param(
    [switch]$SkipRegister
)

$ErrorActionPreference = "Stop"

$projectPath = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$deploymentArgs = @()
if ($SkipRegister) {
    $deploymentArgs += "--skip-register"
}

Write-Host "Executando a implantação pelo WSL em $projectPath" -ForegroundColor Cyan
& wsl.exe --cd $projectPath bash ./scripts/docker-up.sh @deploymentArgs

if ($LASTEXITCODE -ne 0) {
    throw "A implantação do container falhou com o código $LASTEXITCODE."
}
