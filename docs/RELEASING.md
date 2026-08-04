# Publicação de releases

Este documento descreve o processo de versionamento, publicação no GitHub e deploy de produção do Shinobilson Bot. Essas operações são destinadas aos mantenedores do projeto.

## Pré-requisitos

- a `main` deve estar atualizada e com o CI aprovado;
- `package.json` e `package-lock.json` devem possuir a mesma versão;
- a versão deve seguir o versionamento semântico;
- nenhuma execução local e nenhum container devem usar simultaneamente o mesmo token do Discord.

O workflow `.github/workflows/release.yml` é acionado por tags no formato `vX.Y.Z`. A versão da tag, sem o prefixo `v`, precisa ser exatamente igual à versão dos manifestos.

## 1. Preparar a versão

Crie uma branch de release a partir da `main`. Para uma correção, por exemplo:

```bash
git switch main
git pull --ff-only
git switch -c chore/release-v1.0.3
npm version patch --no-git-tag-version
```

Para uma versão minor ou major, substitua `patch` por `minor` ou `major`.

Valide os manifestos e o projeto:

```bash
npm run check
npm run build
git diff --check
```

Crie uma pull request contendo apenas a atualização de versão, aguarde o CI e faça o merge na `main`.

## 2. Criar a tag

Depois do merge, atualize a `main` local e confirme a versão:

```bash
git switch main
git pull --ff-only
node -p "require('./package.json').version"
```

Crie e publique a tag anotada correspondente:

```bash
git tag -a v1.0.3 -m "Release v1.0.3"
git push origin v1.0.3
```

Não reutilize nem mova uma tag de release já publicada.

## 3. Acompanhar a publicação

O workflow executa `npm ci`, verificação TypeScript, build e construção da imagem Linux. Quando todas as etapas passam, ele:

- publica notas automáticas na página de releases;
- envia a imagem para `ghcr.io/h4rdrew/shinobilson-bot`;
- atualiza as tags semânticas correspondentes.

Para `v1.0.3`, são publicadas:

```text
ghcr.io/h4rdrew/shinobilson-bot:1.0.3
ghcr.io/h4rdrew/shinobilson-bot:1.0
ghcr.io/h4rdrew/shinobilson-bot:1
ghcr.io/h4rdrew/shinobilson-bot:latest
```

Não forneça `DISCORD_TOKEN` ao workflow e não execute o Bot durante a publicação.

## 4. Deploy de uma versão

Use sempre uma versão explícita em produção para permitir rollback previsível.

No PowerShell:

```powershell
.\docker-deploy.ps1 -Version 1.0.3
```

No WSL:

```bash
bash ./scripts/docker-deploy.sh 1.0.3
```

O script baixa a imagem do GHCR, atualiza o container, verifica se ele permanece em execução e registra a versão anterior. No VS Code, o mesmo fluxo está disponível em **Docker: deploy release**.

O registro dos comandos slash só precisa ser repetido quando nomes, descrições ou opções públicas mudarem, ou quando houver troca entre registro global e por servidor.

## 5. Rollback

Para retornar à versão anterior registrada, use:

```powershell
.\docker-rollback.ps1
```

Ou, no WSL:

```bash
bash ./scripts/docker-rollback.sh
```

No VS Code, use **Docker: rollback release**. Se uma nova versão não iniciar durante o deploy, o script tenta restaurar automaticamente a versão anterior.

## Pacotes privados

Se o pacote do GHCR estiver privado, autentique o Docker antes do deploy usando um token com permissão `read:packages`. Pacotes públicos não exigem login para download.
