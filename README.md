# Shinobilson Bot

[![CI](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/ci.yml)
[![Release](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/release.yml/badge.svg)](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/release.yml)

Bot de música para Discord com reprodução exclusiva do YouTube e comandos slash:

- `/play busca:<nome ou URL>` — toca uma música ou adiciona à fila;
- `/play-next busca:<nome ou URL>` — adiciona uma música como próxima da fila;
- `/search busca:<nome>` — mostra até cinco resultados para seleção;
- `/queue` — exibe a música atual e a fila;
- `/remove posicao:<número>` — remove uma música específica da fila de espera;
- `/pause` — pausa ou retoma a reprodução;
- `/skip` — pula a música atual;
- `/stop` — limpa a fila e desconecta o bot.

Quando a última música termina, o bot permanece no canal de voz por 1 minuto. Uma nova música
cancela a desconexão e começa imediatamente; `/stop` continua desconectando o bot na hora.

## Início rápido com Docker (sem código-fonte)

Este é o caminho recomendado para quem deseja apenas executar o bot. Não é necessário instalar VS Code, Node.js, Python ou FFmpeg: eles já estão incluídos na imagem.

### 1. Requisitos

- Windows 11 com WSL 2;
- Docker Desktop com integração WSL 2 ou Docker Engine dentro do WSL;
- uma aplicação com bot criada no [Discord Developer Portal](https://discord.com/developers/applications);
- o bot convidado para o servidor com os escopos `bot` e `applications.commands` e as permissões `View Channels`, `Connect`, `Speak` e `Send Messages`.

### 2. Criar a pasta da aplicação

Abra o terminal do WSL e execute:

```bash
mkdir -p ~/shinobilson/logs ~/shinobilson/secrets
cd ~/shinobilson
```

### 3. Criar o arquivo `.env`

Crie o arquivo:

```bash
nano .env
```

Preencha com suas credenciais:

```env
DISCORD_TOKEN=token_do_seu_bot
CLIENT_ID=application_id_do_bot
GUILD_ID=id_do_seu_servidor
YOUTUBE_COOKIES_FILE=
```

Salve no `nano` com `Ctrl+O`, pressione `Enter` e saia com `Ctrl+X`. Nunca compartilhe ou publique esse arquivo.

### 4. Baixar a imagem

```bash
docker pull ghcr.io/h4rdrew/shinobilson-bot:latest
```

### 5. Registrar os comandos slash

Execute uma vez na primeira instalação e novamente somente quando a estrutura dos comandos mudar:

```bash
docker run --rm \
  --env-file .env \
  --entrypoint node \
  ghcr.io/h4rdrew/shinobilson-bot:latest \
  dist/register-commands.js
```

### 6. Iniciar o bot

```bash
docker run -d \
  --name shinobilson-bot \
  --restart unless-stopped \
  --init \
  --env-file .env \
  --security-opt no-new-privileges \
  --cap-drop ALL \
  -v "$(pwd)/logs:/app/logs" \
  -v "$(pwd)/secrets:/app/secrets:ro" \
  ghcr.io/h4rdrew/shinobilson-bot:latest
```

### 7. Confirmar a inicialização

```bash
docker ps
docker logs -f shinobilson-bot
```

A inicialização foi concluída quando aparecer uma mensagem semelhante a:

```text
INFO discord.client.ready
```

Pressione `Ctrl+C` para sair da visualização dos logs; isso não encerra o container. Depois, entre em um canal de voz no Discord e teste `/play`.

### Comandos de administração

```bash
# Parar
docker stop shinobilson-bot

# Iniciar novamente
docker start shinobilson-bot

# Reiniciar
docker restart shinobilson-bot

# Remover o container
docker rm -f shinobilson-bot
```

## Desenvolvimento local pelo código-fonte

### Requisitos

- Node.js 22.12 ou mais recente;
- Python 3.9 ou mais recente disponível como `python3` durante a instalação do `youtube-dl-exec`;
- permissões `View Channels`, `Connect` e `Speak` para o bot no canal de voz.

### Configuração

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

O diretório `secrets` permanece montado como somente leitura. Para permitir que o `yt-dlp`
atualize seu cookie jar sem alterar o arquivo original, o bot cria uma cópia privada e temporária
para cada consulta ou reprodução e a remove quando o processo termina. O runtime Node.js incluído
na imagem também é usado pelo `yt-dlp` para resolver os desafios JavaScript do YouTube.

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

### Deploy de uma release no WSL 2

Depois que o workflow publicar a imagem, faça o deploy de uma versão específica pelo PowerShell:

```powershell
.\docker-deploy.ps1 -Version 1.0.0
```

O script baixa a imagem do GHCR, atualiza o container, verifica se ele permaneceu em execução e registra a versão anterior. No VS Code, o mesmo fluxo está disponível em **Docker: deploy release**.

Para voltar à versão anterior:

```powershell
.\docker-rollback.ps1
```

Ou selecione **Docker: rollback release** no VS Code. Se a nova versão não iniciar, o deploy tenta restaurar automaticamente a versão anterior.

Se o pacote do GHCR for privado, autentique o Docker no registry antes do primeiro deploy usando um token com permissão `read:packages`. Pacotes públicos não exigem login para download.

## Observações sobre o YouTube

O projeto usa `yt-dlp`, instalado automaticamente pelo `youtube-dl-exec`. Como o YouTube altera seus mecanismos com frequência, mantenha as dependências atualizadas. Em servidores onde o YouTube exige login, exporte seus próprios cookies no formato Netscape, proteja o arquivo e indique seu caminho em `YOUTUBE_COOKIES_FILE`. Nunca versione tokens ou cookies.

Use o bot apenas para conteúdo que você tem autorização para reproduzir e observe os termos do YouTube e do Discord.
