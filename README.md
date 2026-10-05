# Proz Saúde — localhost

Este é o projeto Next.js completo, executado somente em localhost.

Prontuário eletrônico hospitalar para demonstração com dados fictícios. O Figma existente orienta a interface; a documentação de mapeamento fica em [docs/figma/](docs/figma/README.md).

## Iniciar

Requer Node.js 24 e npm. No PowerShell, use `npm.cmd` se a execução de `npm.ps1` estiver bloqueada.

```powershell
npm.cmd install
npm.cmd run dev
```

Abra `http://127.0.0.1:3000`.

### Acesso

- Não há usuários pré-cadastrados. A única conta administradora vem de `ADMIN_EMAIL` / `ADMIN_PASSWORD` (mínimo 8 caracteres) em `.env.local` (modelo em `.env.example`). Para trocar a senha, edite o arquivo e reinicie o servidor.
- O administrador entra direto no painel **Contas de acesso**: criar, listar, buscar, editar (nome, e-mail, perfil, nova senha), desativar/reativar e excluir contas de médico, enfermeiro e técnico de enfermagem. Contas com registros clínicos não podem ser excluídas, apenas desativadas. O administrador não acessa dados clínicos.
- Profissionais entram com as contas criadas no painel e chegam primeiro à página do Setembro Amarelo. Usuários, pacientes, prontuários, sessões e auditoria ficam em arquivos JSON em `data/`; anexos ficam em `uploads/`. As pastas são criadas automaticamente e ignoradas pelo Git.

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
- Persistência exclusivamente local em JSON: `users.json`, `patients.json`, `records.json`, `sessions.json` e `audit.json`.
- Anexos são gravados localmente em `uploads/`.
- `docs/IMPLEMENTATION_STATUS.md` registra o andamento e as limitações verificadas.

Consulte [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) para configurar o ambiente.
