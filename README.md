# Proz Saúde — localhost

Este é o projeto Next.js completo. A publicação anterior servia somente uma
prévia visual; veja [a causa e a correção](docs/DEPLOYMENT.md).

Prontuário eletrônico hospitalar para demonstração com dados fictícios. O Figma existente orienta a interface; a documentação de mapeamento fica em [docs/figma/](docs/figma/README.md).

## Iniciar

Requer Node.js 24 e npm. No PowerShell, use `npm.cmd` se a execução de `npm.ps1` estiver bloqueada.

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run dev
```

Abra `http://127.0.0.1:3000`.

### Acesso

- Não há usuários pré-cadastrados. A única conta administradora vem de `ADMIN_EMAIL` / `ADMIN_PASSWORD` (mínimo 8 caracteres) em `.env.local` (modelo em `.env.example`). Para trocar a senha, edite o arquivo e reinicie o servidor.
- O administrador entra direto no painel **Contas de acesso**: criar, listar, buscar, editar (nome, e-mail, perfil, nova senha), desativar/reativar e excluir contas de médico, enfermeiro e técnico de enfermagem. Contas com registros clínicos não podem ser excluídas, apenas desativadas. O administrador não acessa dados clínicos.
- Profissionais entram com as contas criadas no painel e chegam primeiro à página do Setembro Amarelo. O banco e os anexos ficam em `data/` e `uploads/`, ignorados pelo Git.

Para uso com build de produção local:

```powershell
npm.cmd run build
npm.cmd start
```

## Verificação

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

O teste de integração inicia um servidor local com banco temporário e verifica autenticação, proteção de rotas, abertura de 40 slugs internos, acesso ADM, criação de usuário e paciente, permissão por perfil, registros clínicos por perfil (anamnese, exames, resultado, prescrição, checagem, cirurgia, admissão, alergias e saída), atualização do paciente e upload/download de PDF. Os fluxos com revisão (anotação, sinais, checagem e saída) também foram exercitados no navegador em 390 e 1440 px.

## Estrutura

- Next.js App Router, React, TypeScript e Tailwind.
- Prisma para usuários, sessões, pacientes, registros, anexos e auditoria; SQLite local.
- `node:sqlite` apenas para inicializar tabelas e três pacientes fictícios antes da primeira consulta Prisma.
- `prisma/schema.prisma` define os modelos. `DATABASE_PATH` permite mover o arquivo SQLite; veja `.env.example`.
- `docs/IMPLEMENTATION_STATUS.md` registra o andamento e as limitações verificadas.

O Figma atual permaneceu intacto. Desenvolvimento local usa SQLite e uploads
locais; o Worker usa D1 e R2. Consulte [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
para configurar os bindings e aplicar a migration antes de publicar.
