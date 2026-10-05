import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { adminEnvironment } from "@/lib/db";
import { MIN_PASSWORD, passwordHash, verifyPassword } from "@/lib/password";

let database: DatabaseSync | null = null;
export function initializeLocalDatabase() {
  if (database) return;
  const dbPath = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATABASE_PATH || "./data/proz-saude.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  database = new DatabaseSync(dbPath);
  database.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','enfermeiro','tecnico','medico')), password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, chart TEXT NOT NULL UNIQUE, name TEXT NOT NULL, birth TEXT NOT NULL, sex TEXT NOT NULL, mother TEXT NOT NULL DEFAULT '', father TEXT NOT NULL DEFAULT '', document TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', zip TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Internada', ward TEXT NOT NULL DEFAULT '', bed TEXT NOT NULL DEFAULT '', admission TEXT NOT NULL DEFAULT '', allergies TEXT NOT NULL DEFAULT '', risks TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES patients(id), type TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed', author_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS records_patient_type ON records(patient_id,type,created_at);
    CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, record_id TEXT NOT NULL, at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);
  const count = (database.prepare("SELECT COUNT(*) AS count FROM patients").get() as { count: number }).count;
  if (!count) {
    const add = database.prepare("INSERT INTO patients (id,chart,name,birth,sex,mother,status,ward,bed,admission,allergies,risks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
    add.run("pac-maria", "PS-00124", "Maria Oliveira", "1982-05-14", "Feminino", "Helena Oliveira", "Internada", "Enfermaria A", "12", "INT-0042", "Dipirona", "Risco de queda");
    add.run("pac-joao", "PS-00125", "João Santos", "1975-09-03", "Masculino", "Ana Santos", "Internado", "Enfermaria A", "08", "INT-0043", "", "");
    add.run("pac-ana", "PS-00126", "Ana Costa", "1990-02-21", "Feminino", "Lúcia Costa", "Em observação", "Pronto atendimento", "03", "INT-0044", "Penicilina", "");
  }
  database.exec("UPDATE patients SET document='' WHERE document LIKE 'FICTICIO-%'");
  const { email, password, name } = adminEnvironment();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= MIN_PASSWORD) {
    const current = database.prepare("SELECT id,password_hash FROM users WHERE role='admin' ORDER BY created_at LIMIT 1").get() as { id: string; password_hash: string } | undefined;
    if (current) {
      const changed = !verifyPassword(password, current.password_hash);
      database.prepare("UPDATE users SET email=?,name=?,active=1,password_hash=? WHERE id=?").run(email, name.trim().slice(0,120) || "Administrador", changed ? passwordHash(password) : current.password_hash, current.id);
      if (changed) database.prepare("DELETE FROM sessions WHERE user_id=?").run(current.id);
    } else {
      database.prepare("INSERT INTO users(id,email,name,role,password_hash,active,created_at) VALUES(?,?,?,?,?,1,?)").run("admin",email,name.trim().slice(0,120) || "Administrador","admin",passwordHash(password),new Date().toISOString());
    }
  }
}
