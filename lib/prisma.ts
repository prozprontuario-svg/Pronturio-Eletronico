import { PrismaClient, type Patient as PrismaPatient, type ClinicalRecord as PrismaRecord } from "@prisma/client";
import path from "node:path";
import { db, type Patient, type RecordRow } from "@/lib/db";

let client: PrismaClient | undefined;
export function prisma() {
  db(); // Inicializa a estrutura SQLite e os pacientes iniciais antes da conexão Prisma.
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
