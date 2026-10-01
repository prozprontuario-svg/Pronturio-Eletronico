import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { type User } from "@/lib/db";
import { prisma } from "@/lib/prisma";
export { canWrite } from "@/lib/permissions";
export { passwordHash, verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "proz_session";
const EIGHT_HOURS = 8 * 60 * 60 * 1000;
function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + EIGHT_HOURS);
  await prisma().session.create({data:{tokenHash:tokenHash(token),userId,expiresAt:expires.toISOString()}});
  return { token, expires };
}
export async function removeSession(token: string | undefined) {
  if (token) await prisma().session.deleteMany({where:{tokenHash:tokenHash(token)}});
}
export async function userFromToken(token: string | undefined): Promise<User | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma().session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:true}});
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
