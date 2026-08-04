# Contribuindo com o Shinobilson Bot

Obrigado por considerar uma contribuição. O Shinobilson Bot é um projeto aberto, distribuído sob a licença [0BSD](LICENSE), e aceita correções, melhorias de documentação e novas funcionalidades compatíveis com seu objetivo: reproduzir músicas do YouTube no Discord.

## Antes de começar

- Consulte as [issues existentes](https://github.com/h4rdrew/shinobilson-bot/issues) para evitar trabalho duplicado.
- Para mudanças relevantes, abra uma issue descrevendo o problema, a proposta e os impactos esperados antes de implementar.
- Correções pequenas de documentação, mensagens ou erros evidentes podem ser enviadas diretamente em uma pull request.
- Não publique vulnerabilidades, tokens, cookies ou outros segredos em issues. Para problemas de segurança, escreva para [h4rdrew.studios@gmail.com](mailto:h4rdrew.studios@gmail.com).

## Escopo do projeto

O Bot utiliza exclusivamente o YouTube como fonte de pesquisa e reprodução. Contribuições não devem adicionar Spotify, SoundCloud ou outras fontes sem discussão e aprovação prévias.

Os comandos públicos atuais são:

- `/play`
- `/play-next`
- `/search`
- `/queue`
- `/remove`
- `/pause`
- `/skip`
- `/stop`

## Ambiente de desenvolvimento

Requisitos:

- Node.js 24, com versão mínima 22.12;
- npm;
- uma aplicação de teste própria no [Discord Developer Portal](https://discord.com/developers/applications);
- Docker, apenas para validar mudanças na imagem ou nas dependências de mídia.

Instale as dependências:

```bash
npm ci
```

Copie `.env.example` para `.env` e utilize credenciais de uma aplicação Discord criada por você. Nunca use ou solicite o token mantido pelo projeto.

```env
DISCORD_TOKEN=token_do_seu_bot_de_teste
CLIENT_ID=id_da_sua_aplicacao_de_teste
GUILD_ID=id_do_seu_servidor_de_teste
YOUTUBE_COOKIES_FILE=
```

O arquivo de cookies é opcional. Se precisar testar conteúdo autenticado, use uma conta dedicada e mantenha o arquivo fora do Git. Cookies concedem acesso a uma sessão e devem ser tratados como credenciais.

Registre os comandos no servidor de teste somente quando alterar nomes, descrições ou opções dos comandos:

```bash
npm run register
```

Execute o Bot durante o desenvolvimento:

```bash
npm run dev
```

Não conecte simultaneamente uma execução local e um container usando o mesmo token do Discord.

## Fluxo recomendado

1. Faça fork do repositório e crie uma branch a partir da `main` atualizada.
2. Use um nome objetivo, como `feat/nome-da-funcionalidade`, `fix/nome-do-erro` ou `docs/assunto`.
3. Mantenha a mudança pequena e focada em um único objetivo.
4. Atualize testes e documentação relacionados ao comportamento alterado.
5. Execute todas as validações aplicáveis.
6. Abra uma pull request vinculando a issue correspondente, quando existir.

Commits devem ter mensagens curtas e descritivas. Prefixos como `feat:`, `fix:`, `docs:`, `refactor:`, `test:` e `chore:` são recomendados.

## Padrões do código

- Use TypeScript estrito e módulos ESM com importações compatíveis com `NodeNext`.
- Preserve uma fila independente por `guildId`.
- Controles de reprodução devem exigir que o usuário esteja no mesmo canal de voz do Bot.
- Não deixe processos `yt-dlp` ou FFmpeg órfãos ao pular, parar ou destruir uma fila.
- Use `node:stream.pipeline` entre o `yt-dlp` e o FFmpeg.
- Trate cancelamentos intencionais de `/skip` e `/stop` como eventos esperados, não como falhas.
- Uma falha ao enviar mensagem no canal de texto não deve interromper a reprodução.
- Nunca registre tokens, cookies ou o conteúdo completo de arquivos de ambiente.
- Mantenha eventos de log estáveis, contextos pequenos e níveis coerentes: `DEBUG`, `INFO`, `WARN` e `ERROR`.

## Validação obrigatória

Após alterar TypeScript, execute:

```bash
npm run check
npm run build
```

Após alterar o Dockerfile ou dependências de mídia, também execute:

```bash
docker compose build bot
docker run --rm --entrypoint node shinobilson-bot:latest -e "const cp=require('node:child_process'); const ff=require('ffmpeg-static'); cp.execFileSync(ff,['-version'],{stdio:'inherit'}); cp.execFileSync('./node_modules/youtube-dl-exec/bin/yt-dlp',['--version'],{stdio:'inherit'});"
```

Antes de enviar a pull request, confirme também que não há erros de whitespace:

```bash
git diff --check
```

## Docker e WSL 2

No Windows com Docker configurado no WSL 2, o fluxo completo de build e execução local pode ser iniciado pelo PowerShell na raiz do projeto:

```powershell
.\docker-up.ps1
```

O script valida o `.env`, constrói a imagem Linux, registra os comandos slash, recria o container e inicia o Bot em segundo plano. Não use esse fluxo com o mesmo token de outra execução ativa.

Dentro do WSL, o equivalente é:

```bash
bash ./scripts/docker-up.sh
```

Comandos úteis para desenvolvimento:

```bash
# Acompanhar os logs
docker compose logs -f bot

# Reiniciar sem reconstruir
docker compose restart bot

# Parar e remover o container
docker compose down

# Reconstruir depois de alterar o código
bash ./scripts/docker-up.sh
```

No VS Code, **Docker: build + deploy** recompila e sobe a nova versão sem registrar novamente os comandos slash. Use `npm run register` ou o fluxo completo apenas quando a estrutura pública dos comandos mudar.

## Pull requests

Uma boa pull request deve:

- explicar o problema e a solução adotada;
- ser focada e evitar alterações não relacionadas;
- indicar os comandos de validação executados;
- incluir logs relevantes, sem segredos ou dados pessoais desnecessários;
- atualizar o README quando alterar instalação, configuração, comandos, Docker, deploy ou release;
- informar mudanças no registro de comandos slash;
- manter `dist/`, `.env`, cookies, `secrets/` e `logs/` fora do commit.

O CI precisa concluir com sucesso antes do merge. Revisões podem solicitar ajustes para preservar segurança, compatibilidade e as invariantes do player.

Releases e deploys versionados são responsabilidade dos mantenedores. O processo está documentado em [docs/RELEASING.md](docs/RELEASING.md).

## Licença das contribuições

Ao enviar uma contribuição, você confirma que possui o direito de disponibilizá-la sob a [Zero-Clause BSD (0BSD)](LICENSE), a mesma licença do código original do projeto. Código copiado de terceiros deve possuir licença compatível e ter sua origem e licença documentadas em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), quando aplicável.

## Dúvidas

Use uma [issue](https://github.com/h4rdrew/shinobilson-bot/issues/new) para dúvidas relacionadas ao desenvolvimento ou entre em contato pelo e-mail [h4rdrew.studios@gmail.com](mailto:h4rdrew.studios@gmail.com).
