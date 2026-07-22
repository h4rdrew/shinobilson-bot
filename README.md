# Shinobilson Bot

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

## Observações sobre o YouTube

O projeto usa `yt-dlp`, instalado automaticamente pelo `youtube-dl-exec`. Como o YouTube altera seus mecanismos com frequência, mantenha as dependências atualizadas. Em servidores onde o YouTube exige login, exporte seus próprios cookies no formato Netscape, proteja o arquivo e indique seu caminho em `YOUTUBE_COOKIES_FILE`. Nunca versione tokens ou cookies.

Use o bot apenas para conteúdo que você tem autorização para reproduzir e observe os termos do YouTube e do Discord.
