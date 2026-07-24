# AGENTS.md

Este arquivo orienta agentes que alterem este repositório. As instruções valem para todo o projeto.

## Objetivo do projeto

O Shinobilson Bot é um bot de música para Discord com integração exclusiva ao YouTube. Ele oferece os comandos slash `/play`, `/play-next`, `/search`, `/queue`, `/pause`, `/skip` e `/stop`, mantendo uma fila independente por servidor.

## Stack e requisitos

- Node.js 24 (mínimo aceito pelo projeto: 22.12).
- TypeScript em modo estrito e módulos ESM (`NodeNext`).
- `discord.js` e `@discordjs/voice` para Discord e áudio.
- `youtube-dl-exec`/`yt-dlp` para pesquisa e extração do YouTube.
- `ffmpeg-static` para converter o áudio em PCM estéreo de 48 kHz.
- `opusscript` para codificação Opus.
- Python 3 é necessário na imagem Linux para executar o `yt-dlp` instalado pelo pacote.

Não introduza outras fontes de música sem uma solicitação explícita. O player deve continuar aceitando apenas URLs do YouTube ou pesquisas resolvidas pelo YouTube.

## Mapa do código

- `src/index.ts`: cliente Discord, roteamento dos comandos e respostas às interações.
- `src/commands.ts`: definições públicas dos comandos slash.
- `src/register-commands.ts`: registro dos comandos no Discord.
- `src/music-queue.ts`: conexão de voz, fila, subprocessos, FFmpeg e ciclo de reprodução.
- `src/youtube.ts`: validação de URL, pesquisa e inicialização do `yt-dlp`.
- `src/logger.ts`: logs estruturados no console e em `logs/bot.log`.
- `src/config.ts`: leitura e validação das variáveis de ambiente.
- `src/format.ts`: formatação de duração e textos.

## Invariantes importantes

- Nunca registre tokens, cookies ou conteúdo completo do `.env`.
- O arquivo de cookies é opcional. Um caminho configurado, mas inexistente, deve gerar aviso e permitir que o bot continue sem cookies.
- Passe `noPlaylist: true` somente para URL direta. Não passe `noPlaylist: false`: o wrapper pode convertê-lo na opção inválida `--no-no-playlist`.
- Use `node:stream.pipeline` entre `yt-dlp` e FFmpeg. Um pipe direto pode causar `EPIPE` não tratado durante `/skip` ou `/stop`.
- Encerramentos `SIGTERM`, `EPIPE` e erros de escrita do FFmpeg provocados pelo próprio `/skip` ou `/stop` são cancelamentos esperados, não falhas de reprodução.
- Marque subprocessos encerrados intencionalmente antes de matá-los para que o logger use `youtube.stream.cancelled`, e não `youtube.stream.failed`.
- Não deixe processos `yt-dlp` ou FFmpeg órfãos ao trocar, parar ou destruir uma fila.
- Controles de reprodução só podem ser usados por membros no mesmo canal de voz do bot.
- Uma falha ao enviar mensagem no canal de texto não deve interromper a música.
- A fila deve ser isolada por `guildId` e removida do gerenciador quando ficar vazia.

## Configuração e segredos

Variáveis usadas:

- `DISCORD_TOKEN`: obrigatória.
- `CLIENT_ID`: obrigatória.
- `GUILD_ID`: opcional; registra comandos rapidamente em um servidor de testes. Sem ela, o registro é global.
- `YOUTUBE_COOKIES_FILE`: opcional.

Arquivos `.env`, `.deploy.env`, cookies, `secrets/` e `logs/` não podem ser versionados. A imagem Docker também não pode copiá-los.

## Validação obrigatória

Depois de alterar TypeScript, execute:

```bash
npm run check
npm run build
```

Depois de alterar Docker ou dependências de mídia, também construa a imagem e valide os binários dentro dela:

```bash
docker compose build bot
docker run --rm --entrypoint node shinobilson-bot:latest -e "const cp=require('node:child_process'); const ff=require('ffmpeg-static'); cp.execFileSync(ff,['-version'],{stdio:'inherit'}); cp.execFileSync('./node_modules/youtube-dl-exec/bin/yt-dlp',['--version'],{stdio:'inherit'});"
```

Não conecte simultaneamente a execução local e o container usando o mesmo token do Discord.

## Comandos slash

O registro precisa ser repetido somente quando nome, descrição ou opções de um comando mudarem, ou quando houver troca entre registro global e por servidor.

```bash
npm run register
```

Alterações apenas na lógica interna não exigem novo registro.

## Docker

- `Dockerfile`: build multi-stage Linux da aplicação.
- `compose.yaml`: build e execução local da imagem.
- `compose.prod.yaml`: execução de uma imagem versionada do GHCR.
- `docker-up.ps1` e `scripts/docker-up.sh`: build/deploy local; podem registrar comandos.
- `docker-deploy.ps1` e `scripts/docker-deploy.sh`: deploy de uma release sem build local.
- `docker-rollback.ps1` e `scripts/docker-rollback.sh`: retorno à versão anterior registrada.

A imagem de produção é:

```text
ghcr.io/h4rdrew/shinobilson-bot:<versão>
```

O deploy de produção deve usar uma versão explícita, como `1.0.1`, sempre que previsibilidade e rollback forem importantes. `latest` é adequado apenas para instalação simplificada de usuários finais.

## CI e releases

- `.github/workflows/ci.yml` valida TypeScript, build e imagem Docker em pushes e pull requests para `main`.
- `.github/workflows/release.yml` é disparado por tags `vX.Y.Z`.
- A versão da tag sem o prefixo `v` deve ser idêntica ao campo `version` de `package.json` e `package-lock.json`.
- Releases publicam tags semânticas no GHCR e criam notas automáticas no GitHub.
- O workflow de release não deve receber `DISCORD_TOKEN` nem executar o bot.

Exemplo de preparação de uma correção:

```bash
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: release v1.0.1"
git push origin main
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

## Logs

Logs persistentes ficam em `logs/bot.log` no formato JSON Lines; o console usa uma representação legível. Use eventos estáveis e contextos pequenos, incluindo `guildId` e `trackId` quando úteis.

Classificação esperada:

- `DEBUG`: transições e cancelamentos normais.
- `INFO`: comandos, filas, conexão, início e término esperado de processos.
- `WARN`: condições recuperáveis, como cookies opcionais ausentes.
- `ERROR`: falhas que impedem ou interrompem uma operação solicitada.

## Documentação

Atualize o `README.md` quando alterar instalação, configuração, comandos públicos, Docker, deploy ou release. Mantenha o início rápido para usuários finais separado das instruções de desenvolvimento pelo código-fonte.
