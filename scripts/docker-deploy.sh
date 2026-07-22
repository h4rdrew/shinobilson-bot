#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

VERSION="${1:-}"
if [[ ! "${VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Uso: bash ./scripts/docker-deploy.sh <versão>" >&2
  echo "Exemplo: bash ./scripts/docker-deploy.sh 1.0.0" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Erro: Docker não foi encontrado nesta distribuição WSL." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Erro: o Docker não está ativo ou seu usuário não tem acesso a ele." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Erro: Docker Compose v2 não foi encontrado." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Erro: o arquivo .env não existe na raiz do projeto." >&2
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

current_version=""
if [[ -f .deploy.env ]]; then
  current_version="$(sed -nE 's/^[[:space:]]*BOT_VERSION[[:space:]]*=[[:space:]]*([^[:space:]#]+).*/\1/p' .deploy.env | tail -n 1)"
fi

if [[ -n "${current_version}" && "${current_version}" != "${VERSION}" ]]; then
  printf 'BOT_VERSION=%s\n' "${current_version}" > .deploy.env.previous
fi
printf 'BOT_VERSION=%s\n' "${VERSION}" > .deploy.env

COMPOSE=(docker compose --env-file .deploy.env -f compose.prod.yaml)

echo "[1/3] Baixando ghcr.io/h4rdrew/shinobilson-bot:${VERSION}..."
if ! "${COMPOSE[@]}" pull bot; then
  if [[ -n "${current_version}" ]]; then
    printf 'BOT_VERSION=%s\n' "${current_version}" > .deploy.env
  fi
  echo "Erro ao baixar a imagem. Se o pacote for privado, autentique-se primeiro no ghcr.io." >&2
  exit 1
fi

echo "[2/3] Atualizando o container..."
"${COMPOSE[@]}" up -d --remove-orphans bot

echo "[3/3] Verificando a nova versão..."
container_id="$("${COMPOSE[@]}" ps -q bot)"
sleep 3

if [[ -z "${container_id}" || "$(docker inspect --format '{{.State.Running}}' "${container_id}" 2>/dev/null || true)" != "true" ]]; then
  echo "Erro: a versão ${VERSION} não permaneceu em execução." >&2
  "${COMPOSE[@]}" logs --tail 80 bot || true

  if [[ -n "${current_version}" && "${current_version}" != "${VERSION}" ]]; then
    echo "Restaurando automaticamente a versão ${current_version}..." >&2
    printf 'BOT_VERSION=%s\n' "${current_version}" > .deploy.env
    ROLLBACK_COMPOSE=(docker compose --env-file .deploy.env -f compose.prod.yaml)
    "${ROLLBACK_COMPOSE[@]}" pull bot
    "${ROLLBACK_COMPOSE[@]}" up -d --remove-orphans bot
  fi
  exit 1
fi

running_image="$(docker inspect --format '{{.Config.Image}}' "${container_id}")"
echo "Deploy concluído: ${running_image}"
"${COMPOSE[@]}" ps bot
"${COMPOSE[@]}" logs --tail 20 bot
