import { PrismaClient, type Patient as PrismaPatient, type ClinicalRecord as PrismaRecord } from "@prisma/client";
import path from "node:path";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type Patient, type RecordRow } from "@/lib/db";

let client: PrismaClient | undefined;
export async function prisma() {
  if (client) return client;
  try {
    const { DB } = getCloudflareContext().env as { DB?: ConstructorParameters<typeof PrismaD1>[0] };
    if (DB) {
      client = new PrismaClient({ adapter: new PrismaD1(DB) });
      return client;
    }
  } catch { /* Fora do request Cloudflare, usar SQLite somente no desenvolvimento local. */ }
  if (process.env.NEXTJS_ENV === "production" || (process.env.NODE_ENV === "production" && process.env.CF_PAGES)) throw new Error("Binding D1 não configurado.");
  const { initializeLocalDatabase } = await import("@/lib/local-db");
  initializeLocalDatabase();
  if (!client) {
    const dbPath = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATABASE_PATH || "./data/proz-saude.sqlite");
    client = new PrismaClient({ datasources: { db: { url: `file:${dbPath.replaceAll("\\","/")}` } } });
  }
  return client;
}
export function patientFromPrisma(row: PrismaPatient): Patient {
  const { createdAt, ...rest } = row;
  return { ...rest, created_at: createdAt };
}
export function recordFromPrisma(row: PrismaRecord): RecordRow {
  const { patientId, authorId, createdAt, updatedAt, ...rest } = row;
  return { ...rest, patient_id: patientId, author_id: authorId, created_at: createdAt, updated_at: updatedAt };
}
