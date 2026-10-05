import { getCloudflareContext } from "@opennextjs/cloudflare";
import { MIN_PASSWORD } from "@/lib/password";

export type Role = "admin" | "enfermeiro" | "tecnico" | "medico";
export type User = { id: string; email: string; name: string; role: Role; active: number; password_hash: string };
export type Patient = { id: string; chart: string; name: string; birth: string; sex: string; mother: string; father: string; document: string; phone: string; zip: string; address: string; city: string; status: string; ward: string; bed: string; admission: string; allergies: string; risks: string; created_at: string };
export type RecordRow = { id: string; patient_id: string; type: string; data: string; status: string; author_id: string; created_at: string; updated_at: string };

export function adminEnvironment() {
  let bindings: Record<string, unknown> = {};
  try { bindings = getCloudflareContext().env as Record<string, unknown>; }
  catch { /* Desenvolvimento local usa .env.local. */ }
  return {
    email: String(bindings.ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase() || "admin@hospital.com",
    password: String(bindings.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? ""),
    name: String(bindings.ADMIN_NAME ?? process.env.ADMIN_NAME ?? "Administrador"),
  };
}

export function adminConfigured() {
  const { email, password } = adminEnvironment();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= MIN_PASSWORD;
}

export async function audit(userId: string, action: string, entity: string, recordId: string) {
  const { prisma } = await import("@/lib/prisma");
  return (await prisma()).audit.create({ data: { id: crypto.randomUUID(), userId, action, entity, recordId, at: new Date().toISOString() } });
}
