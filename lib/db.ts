import { MIN_PASSWORD } from "@/lib/password";
import { store } from "@/lib/json-db";

export type Role = "admin" | "enfermeiro" | "tecnico" | "medico";
export type User = { id: string; email: string; name: string; role: Role; active: number; password_hash: string };
export type Patient = { id: string; chart: string; name: string; birth: string; sex: string; mother: string; father: string; document: string; phone: string; zip: string; address: string; city: string; status: string; ward: string; bed: string; admission: string; allergies: string; risks: string; created_at: string };
export type RecordRow = { id: string; patient_id: string; type: string; data: string; status: string; author_id: string; created_at: string; updated_at: string };

export function adminEnvironment() {
  return {
    email: String(process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
    password: String(process.env.ADMIN_PASSWORD ?? ""),
    name: String(process.env.ADMIN_NAME ?? "Administrador"),
  };
}

export function adminConfigured() {
  const { email, password } = adminEnvironment();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= MIN_PASSWORD;
}

export async function audit(userId: string, action: string, entity: string, recordId: string) {
  return (await store()).audit.create({ data: { id: crypto.randomUUID(), userId, action, entity, recordId, at: new Date().toISOString() } });
}
