import { NextRequest, NextResponse } from "next/server";
import { createSession, removeSession, requestUser, sameOrigin, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { safeText } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const user = await requestUser(request);
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  return NextResponse.json({ id: user.id, name: user.name, role: user.role, email: user.email });
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const email = safeText(body.email, 254).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const user = await prisma().user.findUnique({where:{email}});
  if (!user || !user.active || !verifyPassword(password, user.passwordHash))
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true, role: user.role });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", expires: session.expires,
  });
  return response;
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  await removeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
