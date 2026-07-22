# Shinobilson Bot

[![CI](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/ci.yml)
[![Release](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/release.yml/badge.svg)](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/release.yml)

Bot de música para Discord com reprodução exclusiva do YouTube e comandos slash:

- `/play busca:<nome ou URL>` — toca uma música ou adiciona à fila;
- `/search busca:<nome>` — mostra até cinco resultados para seleção;
- `/queue` — exibe a música atual e a fila;
- `/pause` — pausa ou retoma a reprodução;
- `/skip` — pula a música atual;
- `/stop` — limpa a fila e desconecta o bot.

## Requisitos

- Node.js 22.12 ou mais recente;
- Python 3.9 ou mais recente disponível como `python3` durante a instalação do `youtube-dl-exec`;
- permissões `View Channels`, `Connect` e `Speak` para o bot no canal de voz.

## Configuração

1. Crie uma aplicação no [Discord Developer Portal](https://discord.com/developers/applications) e adicione um bot.
2. Em **OAuth2 > URL Generator**, marque `bot` e `applications.commands`. Nas permissões do bot, marque `View Channels`, `Connect`, `Speak` e `Send Messages`, e use a URL gerada para convidá-lo.
3. Copie `.env.example` para `.env` e preencha `DISCORD_TOKEN` e `CLIENT_ID`. Durante o desenvolvimento, preencha também `GUILD_ID` com o ID do seu servidor para que os comandos apareçam imediatamente.
4. Instale, registre os comandos e inicie:

```bash
npm install
npm run register
npm run build
npm start
```

Para desenvolvimento com recarga automática:

```bash
npm run dev
```

## Logs e diagnóstico

O bot registra eventos no terminal e em `logs/bot.log`. O arquivo inclui as etapas do comando, pesquisa do YouTube, conexão de voz, execução do `yt-dlp`, FFmpeg e mudanças de estado do player. Tokens e cookies não são registrados.

Para acompanhar o arquivo em tempo real no PowerShell:

```powershell
Get-Content .\logs\bot.log -Wait
```

## Docker com WSL 2

Com o Docker configurado no WSL 2, abra o PowerShell na raiz do projeto e execute:

```powershell
.\docker-up.ps1
```

O script valida o `.env`, constrói uma imagem Linux, registra os comandos slash, cria o container e inicia o bot em segundo plano. Os logs ficam persistidos na pasta `logs` e a pasta opcional `secrets` é montada como somente leitura.

No VS Code, a configuração **Docker: build + deploy** recompila e publica uma nova versão no container sem registrar novamente os comandos slash. Se estiver executando o bot localmente, encerre-o antes desse deploy para evitar duas sessões com o mesmo token.

Também é possível executar diretamente dentro do WSL:

```bash
bash ./scripts/docker-up.sh
```

Comandos úteis, executados na raiz do projeto dentro do WSL:

```bash
# Acompanhar os logs
docker compose logs -f bot

# Reiniciar
docker compose restart bot

# Parar e remover o container
docker compose down

# Reconstruir depois de alterar o código
bash ./scripts/docker-up.sh
```

Quando usar cookies no container, mantenha o arquivo em `secrets/youtube-cookies.txt` e configure:

```env
YOUTUBE_COOKIES_FILE=/app/secrets/youtube-cookies.txt
```

## Criando uma release

O workflow de release é acionado por tags no formato `vX.Y.Z`. A versão da tag precisa ser igual ao campo `version` do `package.json`.

Para criar a primeira release:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

Após as validações, o GitHub cria as notas da release e publica a imagem com tags semânticas no GitHub Container Registry:

```text
ghcr.io/h4rdrew/shinobilson-bot:1.0.0
ghcr.io/h4rdrew/shinobilson-bot:1.0
ghcr.io/h4rdrew/shinobilson-bot:1
ghcr.io/h4rdrew/shinobilson-bot:latest
```

Para uma nova versão, atualize primeiro o `package.json`. Por exemplo:

```bash
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: release v1.0.1"
git push origin main
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

## Observações sobre o YouTube

O projeto usa `yt-dlp`, instalado automaticamente pelo `youtube-dl-exec`. Como o YouTube altera seus mecanismos com frequência, mantenha as dependências atualizadas. Em servidores onde o YouTube exige login, exporte seus próprios cookies no formato Netscape, proteja o arquivo e indique seu caminho em `YOUTUBE_COOKIES_FILE`. Nunca versione tokens ou cookies.

Use o bot apenas para conteúdo que você tem autorização para reproduzir e observe os termos do YouTube e do Discord.
