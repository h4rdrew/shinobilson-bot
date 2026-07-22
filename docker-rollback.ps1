$ErrorActionPreference = "Stop"
$projectPath = (Resolve-Path -LiteralPath $PSScriptRoot).Path

Write-Host "Executando rollback pelo WSL..." -ForegroundColor Yellow
& wsl.exe --cd $projectPath bash ./scripts/docker-rollback.sh

if ($LASTEXITCODE -ne 0) {
    throw "O rollback falhou com o código $LASTEXITCODE."
}
