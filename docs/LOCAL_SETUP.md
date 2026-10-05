# Execução local

O Proz Saúde é executado somente em localhost. Usuários, pacientes, registros,
sessões e auditoria são persistidos em arquivos JSON dentro de `data/`; anexos
ficam em `uploads/`. As pastas e arquivos são criados automaticamente na
primeira execução. O conteúdo dessas pastas é local e ignorado pelo Git.

1. Instale Node.js 20 ou superior.
2. Copie `.env.example` para `.env.local` e defina `ADMIN_EMAIL`,
   `ADMIN_PASSWORD` (mínimo de 8 caracteres) e `ADMIN_NAME`.
3. Execute `npm install` e `npm run dev`.
4. Abra `http://127.0.0.1:3000`.

Senhas de usuários são armazenadas como hashes. Não coloque dados reais de
pacientes, credenciais ou arquivos locais no repositório.
