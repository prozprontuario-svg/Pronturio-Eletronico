import fs from "node:fs/promises";
import path from "node:path";

type Row = Record<string, any>;
type Table = "users" | "patients" | "records" | "sessions" | "audit";
type State = Record<Table, Row[]>;
const names: Record<Table, string> = { users: "users", patients: "patients", records: "records", sessions: "sessions", audit: "audit" };
const empty = (): State => ({ users: [], patients: [], records: [], sessions: [], audit: [] });
let state: State | undefined;
let lock: Promise<unknown> = Promise.resolve();
let transaction = false;
const dataDir = () => path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.PROZ_DATA_DIR || "data");

async function locked<T>(fn: () => Promise<T>): Promise<T> {
  if (transaction) return fn();
  const previous = lock;
  let release!: () => void;
  lock = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try { return await fn(); } finally { release(); }
}
async function persist(table: Table) {
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${names[table]}.json`);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(state![table], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await fs.rename(temp, file);
}
async function load() {
  if (state) return state;
  const dir = dataDir();
  await fs.mkdir(dir, { recursive: true });
  const current = empty();
  for (const table of Object.keys(names) as Table[]) {
    try {
      const value: unknown = JSON.parse(await fs.readFile(path.join(dir, `${names[table]}.json`), "utf8"));
      if (!Array.isArray(value) || !value.every((row) => row && typeof row === "object" && !Array.isArray(row)))
        throw new Error(`Formato inválido em ${names[table]}.json`);
      current[table] = value as Row[];
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw new Error(`Não foi possível ler ${names[table]}.json: ${error.message}`);
    }
  }
  if (current.patients.length === 0) {
    const now = new Date().toISOString();
    current.patients = [
      { id: "pac-maria", chart: "PS-00124", name: "Maria Oliveira", birth: "1982-05-14", sex: "Feminino", mother: "Helena Oliveira", father: "", document: "", phone: "", zip: "", address: "", city: "", status: "Internada", ward: "Enfermaria A", bed: "12", admission: "INT-0042", allergies: "Dipirona", risks: "Risco de queda", createdAt: now },
      { id: "pac-joao", chart: "PS-00125", name: "João Santos", birth: "1975-09-03", sex: "Masculino", mother: "Ana Santos", father: "", document: "", phone: "", zip: "", address: "", city: "", status: "Internado", ward: "Enfermaria A", bed: "08", admission: "INT-0043", allergies: "", risks: "", createdAt: now },
      { id: "pac-ana", chart: "PS-00126", name: "Ana Costa", birth: "1990-02-21", sex: "Feminino", mother: "Lúcia Costa", father: "", document: "", phone: "", zip: "", address: "", city: "", status: "Em observação", ward: "Pronto atendimento", bed: "03", admission: "INT-0044", allergies: "Penicilina", risks: "", createdAt: now },
    ];
  }
  state = current;
  for (const table of Object.keys(names) as Table[]) {
    try { await fs.access(path.join(dir, `${names[table]}.json`)); }
    catch { await persist(table); }
  }
  return state;
}
function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === "OR") return (expected as Row[]).some((condition) => matches(row, condition));
    if (key === "AND") return (expected as Row[]).every((condition) => matches(row, condition));
    const actual = row[key];
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("contains" in expected) return String(actual ?? "").toLocaleLowerCase().includes(String(expected.contains).toLocaleLowerCase());
      if ("startsWith" in expected) return String(actual ?? "").startsWith(String(expected.startsWith));
      if ("in" in expected) return expected.in.includes(actual);
      if ("not" in expected) return actual !== expected.not;
    }
    return actual === expected;
  });
}
function project(row: Row, select?: Row): Row {
  if (!select) return { ...row };
  return Object.fromEntries(Object.entries(select).filter(([, yes]) => yes).map(([key]) => [key, row[key]]));
}
const tableFor: Record<string, Table> = { user: "users", patient: "patients", clinicalRecord: "records", session: "sessions", audit: "audit" };
async function query(table: Table, args: Row = {}): Promise<Row[]> {
  const rows = (await load())[table].filter((row) => matches(row, args.where));
  const order = args.orderBy && Object.entries(args.orderBy)[0] as [string, string] | undefined;
  if (order) rows.sort((a, b) => String(a[order[0]] ?? "").localeCompare(String(b[order[0]] ?? "")) * (order[1] === "desc" ? -1 : 1));
  const limited = args.take === undefined ? rows : rows.slice(0, args.take);
  return limited.map((row) => {
    const result = project(row, args.select);
    if (args.include?.user && table === "sessions") result.user = (state!.users.find((user) => user.id === row.userId));
    if (args.include?.author && table === "records") result.author = project(state!.users.find((user) => user.id === row.authorId) || {}, args.include.author.select);
    if (args.include?.patient && table === "records") result.patient = state!.patients.find((patient) => patient.id === row.patientId);
    if (args.select?._count && table === "users") result._count = { records: state!.records.filter((record) => record.authorId === row.id).length };
    return result;
  });
}
const delegates: Record<string, Row> = {};
for (const [name, table] of Object.entries(tableFor)) {
  delegates[name] = {
    findUnique: async (args: Row) => (await query(table, { ...args, take: 1 }))[0] ?? null,
    findFirst: async (args: Row) => (await query(table, { ...args, take: 1 }))[0] ?? null,
    findMany: async (args: Row = {}) => query(table, args),
    count: async (args: Row = {}) => (await load())[table].filter((row) => matches(row, args.where)).length,
    create: async ({ data }: Row) => locked(async () => { (await load())[table].push({ ...data }); await persist(table); return { ...data }; }),
    update: async ({ where, data }: Row) => locked(async () => { const row = (await load())[table].find((item) => matches(item, where)); if (!row) throw new Error(`${name} não encontrado`); Object.assign(row, data); await persist(table); return { ...row }; }),
    delete: async ({ where }: Row) => locked(async () => { const rows = (await load())[table]; const index = rows.findIndex((item) => matches(item, where)); if (index < 0) throw new Error(`${name} não encontrado`); const [row] = rows.splice(index, 1); await persist(table); return row; }),
    deleteMany: async ({ where = {} }: Row) => locked(async () => { const rows = (await load())[table]; const kept = rows.filter((item) => !matches(item, where)); const count = rows.length - kept.length; (await load())[table] = kept; if (count) await persist(table); return { count }; }),
  };
}
const database: any = { ...delegates };
database.$transaction = async (callback: (tx: any) => Promise<unknown>) => locked(async () => {
  const snapshot = structuredClone(await load());
  transaction = true;
  try { return await callback(database); }
  catch (error) { state = snapshot; for (const table of Object.keys(names) as Table[]) await persist(table); throw error; }
  finally { transaction = false; }
});
export async function store() {
  return locked(async () => { state = undefined; await load(); return database; });
}
export function patientFrom(row: Row): import("@/lib/db").Patient { const { createdAt, ...rest } = row; return { ...rest, created_at: createdAt } as import("@/lib/db").Patient; }
export function recordFrom(row: Row): import("@/lib/db").RecordRow { const { patientId, authorId, createdAt, updatedAt, ...rest } = row; return { ...rest, patient_id: patientId, author_id: authorId, created_at: createdAt, updated_at: updatedAt } as import("@/lib/db").RecordRow; }
