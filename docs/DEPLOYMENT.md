# Cloudflare Workers

The deployed Next.js app uses OpenNext and Wrangler. Production persistence is
Cloudflare D1 through Prisma's `@prisma/adapter-d1`; attachments are stored in
the private R2 bucket bound as `FILES`. SQLite (`node:sqlite`) and `./uploads`
are loaded only by the local Node.js path. The worker must have both bindings.

## One-time Cloudflare setup

1. Create a D1 database named `proz-saude` and an R2 bucket named
   `proz-saude-private-attachments` in the same Cloudflare account as Worker
   `pronturio-eletronico`.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with that D1
   database's ID. Keep the `DB` and `FILES` binding names unchanged.
3. Apply the initial schema and fictional demo patients:

   ```powershell
   npx wrangler d1 migrations apply proz-saude --remote
   ```

4. Configure `ADMIN_EMAIL` and `ADMIN_NAME` as Worker variables and
   `ADMIN_PASSWORD` as a Worker secret (minimum 8 characters). Before login,
   the app synchronizes the seeded `admin` account and stores only its
   scrypt password hash. Do not add `.env.local` to the Worker or Git.
5. Set the Cloudflare build command to `npm run cf:build`, deploy command to
   `npx wrangler deploy`, and project root to `/`. Build must install
   devDependencies because OpenNext and Wrangler are build dependencies.

No Cloudflare resource is created or deployed by this repository change. The
existing Worker must receive the `DB` and `FILES` bindings and the migration
before the new app version can use D1 and R2. Existing SQLite data and files
cannot be copied from a Worker filesystem; import any records that exist only
in that environment through a separately verified export before cutover.

## API and storage behavior

All API route handlers return a JSON 500 response with the generic message
`Erro interno do servidor` on uncaught failures; details are logged only on
the server. Client login and clinical forms also handle invalid or empty JSON
responses without throwing a JSON parse error.

R2 stores new uploaded documents using their UUID as the object key. The
associated patient, document metadata, and audit entry remain in D1. Local
Node.js development continues to use `DATABASE_PATH` and `UPLOADS_PATH` from
`.env.local`; these values are not read when the Worker has its bindings.

## Local development and checks

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run dev
```

Use `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, and
`npm.cmd run build` for local checks. Integration tests use a temporary local
SQLite database and fictional data; they do not connect to Cloudflare.
