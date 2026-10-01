import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { MIN_PASSWORD, passwordHash, verifyPassword } from "@/lib/password";

export type Role = "admin" | "enfermeiro" | "tecnico" | "medico";
export type User = { id: string; email: string; name: string; role: Role; active: number; password_hash: string };
export type Patient = { id: string; chart: string; name: string; birth: string; sex: string; mother: string; father: string; document: string; phone: string; zip: string; address: string; city: string; status: string; ward: string; bed: string; admission: string; allergies: string; risks: string; created_at: string };
export type RecordRow = { id: string; patient_id: string; type: string; data: string; status: string; author_id: string; created_at: string; updated_at: string };

let database: DatabaseSync | null = null;
let adminSyncedFor = "";
// Reaplica a conta administradora sempre que ADMIN_* mudar (inclusive com o servidor de desenvolvimento rodando).
function ensureAdmin(target: DatabaseSync) {
  const key = [process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, process.env.ADMIN_NAME].join("\n");
  if (key === adminSyncedFor) return;
  syncAdmin(target);
  adminSyncedFor = key;
}
export function db() {
  if (database) { ensureAdmin(database); return database; }
  const dbPath = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATABASE_PATH || "./data/proz-saude.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  database = new DatabaseSync(dbPath);
  database.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','enfermeiro','tecnico','medico')),
      password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY, chart TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      birth TEXT NOT NULL, sex TEXT NOT NULL, mother TEXT NOT NULL DEFAULT '',
      father TEXT NOT NULL DEFAULT '', document TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '', zip TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Internada', ward TEXT NOT NULL DEFAULT '',
      bed TEXT NOT NULL DEFAULT '', admission TEXT NOT NULL DEFAULT '',
      allergies TEXT NOT NULL DEFAULT '', risks TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id),
      type TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed',
      author_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS records_patient_type ON records(patient_id,type,created_at);
    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL,
      entity TEXT NOT NULL, record_id TEXT NOT NULL, at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const count = (database.prepare("SELECT COUNT(*) AS count FROM patients").get() as { count: number }).count;
  if (!count) {
    const add = database.prepare(`INSERT INTO patients
      (id,chart,name,birth,sex,mother,document,status,ward,bed,admission,allergies,risks)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    add.run("pac-maria", "PS-00124", "Maria Oliveira", "1982-05-14", "Feminino", "Helena Oliveira", "", "Internada", "Enfermaria A", "12", "INT-0042", "Dipirona", "Risco de queda");
    add.run("pac-joao", "PS-00125", "João Santos", "1975-09-03", "Masculino", "Ana Santos", "", "Internado", "Enfermaria A", "08", "INT-0043", "", "");
    add.run("pac-ana", "PS-00126", "Ana Costa", "1990-02-21", "Feminino", "Lúcia Costa", "", "Em observação", "Pronto atendimento", "03", "INT-0044", "Penicilina", "");
  }
  // Remove marcações antigas de documento ("FICTICIO-…") dos pacientes iniciais.
  database.exec("UPDATE patients SET document='' WHERE document LIKE 'FICTICIO-%'");
  ensureAdmin(database);
  return database;
}

export function adminConfigured() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (process.env.ADMIN_PASSWORD || "").length >= MIN_PASSWORD;
}
// A única conta administradora vem de ADMIN_EMAIL / ADMIN_PASSWORD (.env.local).
// Alterar o arquivo e reiniciar o servidor atualiza e-mail, nome e senha; sessões antigas são encerradas.
function syncAdmin(database: DatabaseSync) {
  if (!adminConfigured()) return;
  const email = process.env.ADMIN_EMAIL!.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD!;
  const name = (process.env.ADMIN_NAME || "Administrador").trim().slice(0, 120) || "Administrador";
  const admins = database.prepare("SELECT id, email, name, password_hash, active FROM users WHERE role='admin' ORDER BY created_at")
    .all() as { id: string; email: string; name: string; password_hash: string; active: number }[];
  const current = admins.find((row) => row.email === email) || admins[0];
  const now = new Date().toISOString();
  if (!current) {
    const clash = database.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (clash) { console.error("ADMIN_EMAIL já pertence a um usuário clínico; escolha outro e-mail."); return; }
    database.prepare("INSERT INTO users(id,email,name,role,password_hash,active,created_at) VALUES (?,?,?,?,?,1,?)")
      .run("admin", email, name, "admin", passwordHash(password), now);
  } else {
    if (current.email !== email && database.prepare("SELECT id FROM users WHERE email=? AND id<>?").get(email, current.id)) {
      console.error("ADMIN_EMAIL já pertence a um usuário clínico; escolha outro e-mail."); return;
    }
    const passwordChanged = !verifyPassword(password, current.password_hash);
    if (current.email !== email || current.name !== name || passwordChanged || !current.active) {
      database.prepare("UPDATE users SET email=?, name=?, active=1, password_hash=? WHERE id=?")
        .run(email, name, passwordChanged ? passwordHash(password) : current.password_hash, current.id);
      if (passwordChanged || current.email !== email) database.prepare("DELETE FROM sessions WHERE user_id=?").run(current.id);
    }
  }
  // Só existe um administrador: contas administrativas antigas (ex.: criadas pelo /setup anterior) são desativadas.
  for (const extra of admins.filter((row) => row.id !== (current?.id || "admin"))) {
    database.prepare("UPDATE users SET active=0 WHERE id=?").run(extra.id);
    database.prepare("DELETE FROM sessions WHERE user_id=?").run(extra.id);
  }
}

export function audit(userId: string, action: string, entity: string, recordId: string) {
  db().prepare("INSERT INTO audit(id,user_id,action,entity,record_id) VALUES (?,?,?,?,?)")
    .run(crypto.randomUUID(), userId, action, entity, recordId);
}

export function getPatient(id: string): Patient | undefined {
  return db().prepare("SELECT * FROM patients WHERE id=?").get(id) as Patient | undefined;
}
