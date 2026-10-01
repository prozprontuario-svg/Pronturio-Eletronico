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
