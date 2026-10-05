import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { type User } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { adminEnvironment } from "@/lib/db";
import { MIN_PASSWORD, passwordHash, verifyPassword } from "@/lib/password";
export { canWrite } from "@/lib/permissions";
export { passwordHash, verifyPassword } from "@/lib/password";

export async function syncConfiguredAdmin() {
  const { email, password, name } = adminEnvironment();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < MIN_PASSWORD) return;
  const database = prisma();
  const current = await (await database).user.findUnique({ where: { id: "admin" } });
  if (!current || current.role !== "admin") return;
  if (email !== current.email && await (await database).user.findUnique({ where: { email } })) return;
  const passwordChanged = !verifyPassword(password, current.passwordHash);
  if (current.email !== email || current.name !== name || passwordChanged || !current.active) {
    await (await database).user.update({ where: { id: current.id }, data: {
      email, name: name.trim().slice(0, 120) || "Administrador", active: 1,
      ...(passwordChanged ? { passwordHash: passwordHash(password) } : {}),
    } });
    if (passwordChanged || current.email !== email) await (await database).session.deleteMany({ where: { userId: current.id } });
  }
}

export const SESSION_COOKIE = "proz_session";
const EIGHT_HOURS = 8 * 60 * 60 * 1000;
function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + EIGHT_HOURS);
  await (await prisma()).session.create({data:{tokenHash:tokenHash(token),userId,expiresAt:expires.toISOString()}});
  return { token, expires };
}
export async function removeSession(token: string | undefined) {
  if (token) await (await prisma()).session.deleteMany({where:{tokenHash:tokenHash(token)}});
}
export async function userFromToken(token: string | undefined): Promise<User | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await (await prisma()).session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});
  if (!session || session.expiresAt <= new Date().toISOString() || !session.user.active) return null;
  const {passwordHash,createdAt,...user} = session.user;
  return {...user,password_hash:passwordHash,created_at:createdAt} as User;
}
export async function requestUser(request: NextRequest) {
  return userFromToken(request.cookies.get(SESSION_COOKIE)?.value);
}
// O administrador gerencia apenas contas de acesso; dados clínicos ficam restritos aos perfis assistenciais.
export const ADMIN_CLINICAL_DENIED = "O administrador gerencia apenas contas de acesso.";
export async function clinicalUser(request: NextRequest) {
  const user = await requestUser(request);
  return { user: user && user.role !== "admin" ? user : null, status: user ? 403 : 401 };
}
export function clinicalDenied(status: number) {
  return NextResponse.json({ error: status === 401 ? "Sessão expirada." : ADMIN_CLINICAL_DENIED }, { status });
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin === request.nextUrl.origin) return true;
  try {
    const supplied = new URL(origin);
    const host = request.headers.get("host") || request.nextUrl.host;
    const expected = new URL(`${request.nextUrl.protocol}//${host}`);
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return supplied.protocol === expected.protocol && supplied.port === expected.port
      && loopback.has(supplied.hostname) && loopback.has(expected.hostname);
  } catch { return false; }
}
