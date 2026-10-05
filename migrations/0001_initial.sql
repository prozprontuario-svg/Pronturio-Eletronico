PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','enfermeiro','tecnico','medico')),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  chart TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  birth TEXT NOT NULL,
  sex TEXT NOT NULL,
  mother TEXT NOT NULL DEFAULT '',
  father TEXT NOT NULL DEFAULT '',
  document TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Internada',
  ward TEXT NOT NULL DEFAULT '',
  bed TEXT NOT NULL DEFAULT '',
  admission TEXT NOT NULL DEFAULT '',
  allergies TEXT NOT NULL DEFAULT '',
  risks TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS records_patient_type ON records(patient_id,type,created_at);

CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  record_id TEXT NOT NULL,
  at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Conta semente sem credencial utilizável; /api/auth sincroniza ADMIN_* com hash antes do login.
INSERT OR IGNORE INTO users(id,email,name,role,password_hash,active,created_at)
VALUES('admin','admin@hospital.com','Administrador','admin','bootstrap-disabled',1,CURRENT_TIMESTAMP);

-- Dados de demonstração fictícios equivalentes ao seed local.
INSERT OR IGNORE INTO patients(id,chart,name,birth,sex,mother,document,status,ward,bed,admission,allergies,risks)
VALUES
('pac-maria','PS-00124','Maria Oliveira','1982-05-14','Feminino','Helena Oliveira','','Internada','Enfermaria A','12','INT-0042','Dipirona','Risco de queda'),
('pac-joao','PS-00125','João Santos','1975-09-03','Masculino','Ana Santos','','Internado','Enfermaria A','08','INT-0043','',''),
('pac-ana','PS-00126','Ana Costa','1990-02-21','Feminino','Lúcia Costa','','Em observação','Pronto atendimento','03','INT-0044','Penicilina','');
