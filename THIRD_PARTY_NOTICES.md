# Avisos de terceiros

A licença 0BSD do Shinobilson Bot se aplica somente ao código original cujos direitos pertencem à H4rdrew Studios. Bibliotecas, ferramentas, executáveis, imagens-base e pacotes de sistema de terceiros permanecem sujeitos às suas respectivas licenças.

Este inventário apresenta as dependências diretas instaladas pelo projeto na versão 1.0.2. Os textos distribuídos por cada pacote e seus repositórios de origem são as fontes definitivas das respectivas licenças.

## Dependências de produção

| Componente | Versão bloqueada | Licença declarada | Projeto |
| --- | --- | --- | --- |
| `@discordjs/voice` | 0.19.2 | Apache-2.0 | [discord.js](https://github.com/discordjs/discord.js) |
| `discord.js` | 14.27.0 | Apache-2.0 | [discord.js](https://github.com/discordjs/discord.js) |
| `dotenv` | 17.4.2 | BSD-2-Clause | [dotenv](https://github.com/motdotla/dotenv) |
| `ffmpeg-static` | 5.3.0 | GPL-3.0-or-later | [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) |
| `opusscript` | 0.1.1 | MIT | [opusscript](https://github.com/abalabahaha/opusscript) |
| `youtube-dl-exec` | 3.1.9 | MIT | [youtube-dl-exec](https://github.com/microlinkhq/youtube-dl-exec) |

O pacote `ffmpeg-static` distribui um executável do FFmpeg e inclui os textos de licença aplicáveis em seu próprio pacote. O `youtube-dl-exec` instala o executável [yt-dlp](https://github.com/yt-dlp/yt-dlp), disponibilizado sob a Unlicense. A imagem Docker também contém Node.js e pacotes do Debian, cada um sob suas próprias licenças.

## Dependências de desenvolvimento

| Componente | Versão bloqueada | Licença declarada | Projeto |
| --- | --- | --- | --- |
| `@types/node` | 24.13.3 | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `tsx` | 4.23.1 | MIT | [tsx](https://github.com/privatenumber/tsx) |
| `typescript` | 5.9.3 | Apache-2.0 | [TypeScript](https://github.com/microsoft/TypeScript) |

Dependências transitivas também permanecem sujeitas às licenças declaradas nos respectivos pacotes instalados e arquivos de licença.
