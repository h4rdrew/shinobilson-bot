#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Erro: Docker não foi encontrado nesta distribuição WSL." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Erro: o Docker não está ativo ou seu usuário não tem permissão para acessá-lo." >&2
  echo "Inicie o Docker e tente novamente." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Erro: Docker Compose não foi encontrado." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Erro: crie o arquivo .env na raiz do projeto antes de continuar." >&2
  echo "Use: cp .env.example .env" >&2
  exit 1
fi

require_env() {
  local name="$1"
  if ! grep -Eq "^[[:space:]]*${name}[[:space:]]*=[[:space:]]*[^[:space:]#]+" .env; then
    echo "Erro: ${name} está ausente ou vazio no arquivo .env." >&2
    exit 1
  fi
}

require_env DISCORD_TOKEN
require_env CLIENT_ID

mkdir -p logs secrets

echo "[1/4] Construindo a imagem Linux do bot..."
"${COMPOSE[@]}" build bot

echo "[2/4] Registrando os comandos slash no Discord..."
"${COMPOSE[@]}" run --rm --no-deps bot node dist/register-commands.js

echo "[3/4] Criando e iniciando o container..."
"${COMPOSE[@]}" up -d --remove-orphans bot

echo "[4/4] Verificando o estado..."
container_id="$("${COMPOSE[@]}" ps -q bot)"
if [[ -z "${container_id}" ]]; then
  echo "Erro: o container não foi criado." >&2
  "${COMPOSE[@]}" logs --tail 80 bot || true
  exit 1
fi

sleep 3
running="$(docker inspect --format '{{.State.Running}}' "${container_id}")"
if [[ "${running}" != "true" ]]; then
  echo "Erro: o container foi criado, mas não permaneceu em execução." >&2
  "${COMPOSE[@]}" logs --tail 80 bot || true
  exit 1
fi

"${COMPOSE[@]}" ps bot
echo
echo "Bot iniciado. Últimos logs:"
"${COMPOSE[@]}" logs --tail 25 bot
echo
echo "Para acompanhar: docker compose logs -f bot"
echo "Para parar:       docker compose down"
