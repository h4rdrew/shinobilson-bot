#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_DIR}"

if [[ ! -f .deploy.env.previous ]]; then
  echo "Erro: nenhuma versão anterior foi registrada em .deploy.env.previous." >&2
  exit 1
fi

PREVIOUS_VERSION="$(sed -nE 's/^[[:space:]]*BOT_VERSION[[:space:]]*=[[:space:]]*([^[:space:]#]+).*/\1/p' .deploy.env.previous | tail -n 1)"
if [[ -z "${PREVIOUS_VERSION}" ]]; then
  echo "Erro: BOT_VERSION não foi encontrada em .deploy.env.previous." >&2
  exit 1
fi

echo "Executando rollback para ${PREVIOUS_VERSION}..."
bash "${SCRIPT_DIR}/docker-deploy.sh" "${PREVIOUS_VERSION}"
