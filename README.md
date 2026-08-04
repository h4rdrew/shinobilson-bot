# Shinobilson Bot

[![CI](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/ci.yml)
[![Release](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/release.yml/badge.svg)](https://github.com/h4rdrew/shinobilson-bot/actions/workflows/release.yml)

[Como contribuir](CONTRIBUTING.md) · [Política de Privacidade](https://h4rdrew.github.io/shinobilson-bot/privacy.html) · [Termos de Serviço](https://h4rdrew.github.io/shinobilson-bot/terms.html)

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
GUILD_ID=
YOUTUBE_COOKIES_FILE=
```

Salve no `nano` com `Ctrl+O`, pressione `Enter` e saia com `Ctrl+X`. Nunca compartilhe ou publique esse arquivo.

Deixe `GUILD_ID` vazio para registrar os comandos globalmente em todos os servidores que adicionarem o Bot. Preencha essa variável somente quando quiser restringir o registro a um servidor de testes.

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

## Desenvolvimento e contribuição

Para configurar o projeto pelo código-fonte, executar as validações e enviar mudanças, consulte o [guia de contribuição](CONTRIBUTING.md). O processo de versionamento e publicação é mantido separadamente em [docs/RELEASING.md](docs/RELEASING.md).

## Logs e diagnóstico

O bot registra eventos no terminal e em `logs/bot.log`. O arquivo inclui as etapas do comando, pesquisa do YouTube, conexão de voz, execução do `yt-dlp`, FFmpeg e mudanças de estado do player. Tokens e cookies não são registrados.

Para acompanhar o arquivo em tempo real no PowerShell:

```powershell
Get-Content .\logs\bot.log -Wait
```

## Observações sobre o YouTube

O projeto usa `yt-dlp`, instalado automaticamente pelo `youtube-dl-exec`. Como o YouTube altera seus mecanismos com frequência, mantenha as dependências atualizadas. Em servidores onde o YouTube exige login, exporte seus próprios cookies no formato Netscape, proteja o arquivo e indique seu caminho em `YOUTUBE_COOKIES_FILE`. Nunca versione tokens ou cookies.

Quando usar cookies no container, mantenha o arquivo em `secrets/youtube-cookies.txt` e configure:

```env
YOUTUBE_COOKIES_FILE=/app/secrets/youtube-cookies.txt
```

O diretório `secrets` é montado como somente leitura. O Bot cria uma cópia privada e temporária do arquivo para cada consulta ou reprodução e a remove quando o processo termina, permitindo que o `yt-dlp` trabalhe sem alterar o original.

Use o bot apenas para conteúdo que você tem autorização para reproduzir e observe os termos do YouTube e do Discord.

## Licença

O código original do Shinobilson Bot é disponibilizado sob a [Zero-Clause BSD (0BSD)](LICENSE). Você pode usar, copiar, modificar e distribuir o software para qualquer finalidade, inclusive comercial, sem obrigação de atribuição.

Componentes de terceiros mantêm suas próprias licenças. Consulte [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) para o inventário das dependências diretas e dos executáveis distribuídos com o projeto.
