# Aplicação real e prévia visual

O build `a868da4` publicava apenas `Proz-Saude/Preview` como arquivos estáticos.
O comando de build verificava a sintaxe de `app.js`, sem compilar Next.js.
Isso explica por que o endereço do Cloudflare abria a demonstração visual.

Este repositório agora contém a aplicação real na raiz: `app/`, `components/`,
`lib/`, `prisma/` e `public/`. Os comandos `dev`, `build` e `start` usam Next.js.
Os arquivos de `Proz-Saude/Preview` foram removidos: não há mais página de
demonstração, seletor de telas ou alternância manual entre desktop e celular.
O servidor estático e a configuração Wrangler que publicavam a prévia também
foram removidos. A entrada do sistema é o login em `/`.

## Execução local

```powershell
npm.cmd ci
npm.cmd run db:generate
# Configure .env.local a partir de .env.example, sem compartilhar as credenciais.
npm.cmd run dev
```

Abra `http://127.0.0.1:3000`. Para produção local, use `npm.cmd run build` e
`npm.cmd start`. A autenticação, o banco SQLite, os anexos e a auditoria usam
a implementação real do prontuário.

## Limite do Cloudflare

### Falha de publicação de 01/10/2026 — código 10143

O log do commit `0206a77` mostra que o build Next.js e o build OpenNext
terminaram, mas a publicação foi recusada: `WORKER_SELF_REFERENCE` apontava
para `proz-saude-local`, enquanto o Worker existente era `pronturio-eletronico`.
Sem uma configuração versionada do adaptador, o comando `npx wrangler deploy`
executou a migração automática; OpenNext usou o campo `name` de `package.json`
para gerar o nome do serviço. O nome do pacote e o lockfile agora usam
`pronturio-eletronico`, alinhado ao Worker do painel, para corrigir essa
referência na próxima geração. Não renomear esse pacote sem revisar a
configuração gerada do Cloudflare.

Essa correção trata a falha de referência do serviço. Não constitui validação
do runtime, da autenticação ou da persistência no Cloudflare. Os requisitos
de adaptação do banco e dos anexos continuam descritos abaixo. As credenciais
de `.env.local` não são enviadas ao GitHub nem configuradas por esta mudança.

Referências: [geração do nome pelo OpenNext](https://github.com/opennextjs/opennextjs-cloudflare/blob/main/packages/cloudflare/src/cli/utils/create-wrangler-config.ts)
e [configuração de WORKER_SELF_REFERENCE](https://opennext.js.org/cloudflare/get-started).

### Falha de instalação de 01/10/2026 — npm E404

O log seguinte passou pelo build Next.js, mas a migração automática não
conseguiu baixar `baseline-browser-mapping@2.11.27`. O endpoint do arquivo
retornou HTTP 404; o arquivo da versão `2.11.26` retornou HTTP 200.

Agora o repositório inclui OpenNext `1.20.7` e Wrangler `4.146.0` com versões
exatas e lockfile. `overrides` fixa `baseline-browser-mapping` em `2.11.26`.
Next.js foi atualizado para `16.3.8`, compatível com o peer dependency do
adaptador. `wrangler.jsonc` e `open-next.config.ts` ficam versionados, com
o mesmo nome em `name` e `WORKER_SELF_REFERENCE`.

As configurações atuais do painel continuam: build `npm run build`, deploy
`npx wrangler deploy`, raiz `/`. O script `postbuild` empacota a saída Next.js
com OpenNext usando `--skipNextBuild`, sem repetir a compilação Next.js.
Assim `.open-next/worker.js` e `.open-next/assets` já existem quando Wrangler
inicia; ele usa o pacote instalado pelo lockfile e não precisa migrar o
projeto nem instalar o adaptador durante a publicação. `.open-next/` fica
ignorado pelo Git. A instalação deve incluir as devDependencies.

Empacotar e publicar não valida a persistência do sistema no runtime Workers:
o banco SQLite local e os anexos em disco ainda dependem da adaptação abaixo.

A aplicação depende de Node.js 24, SQLite/Prisma e armazenamento no disco.
O build Next.js não é um diretório estático que possa substituir `Preview`
no Wrangler. Servir o sistema em Workers exige adaptar o runtime e a
persistência; essa migração não faz parte da versão local. O filesystem de
Workers é temporário e não substitui o disco persistente usado pelo banco e
pelos anexos deste projeto. Referências oficiais:

- [Next.js com OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [Filesystem de Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/)

Não execute `npx wrangler deploy` com a configuração antiga. As instruções
permanentes em `AGENTS.md` e `docs/PROJECT_SOURCE_OF_TRUTH.md` mantêm esta
versão em localhost e proíbem deploy ou ativação de serviços externos.
Alterar os arquivos locais não altera o endereço que já foi publicado.

## Validação local — 01/10/2026

`npm run lint`, `npm run typecheck`, `npm run build` e `npm test` passaram
na raiz deste repositório. O teste existente executou o fluxo real de
autenticação, autorização, contas, pacientes, registros clínicos e anexos
com banco temporário e dados fictícios.
