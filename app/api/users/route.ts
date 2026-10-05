import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { passwordHash, requestUser, sameOrigin } from "@/lib/auth";
import { MIN_PASSWORD } from "@/lib/password";
import { safeText, validEmail } from "@/lib/validation";
import { store } from "@/lib/json-db";
import { withApiErrors } from "@/lib/api";

export const runtime = "nodejs";
// O painel administra apenas contas assistenciais; a conta administradora vem do .env.local.
const clinicalRoles = ["medico", "enfermeiro", "tecnico"];

async function adminOnly(request: NextRequest, write = true) {
  const user = await requestUser(request);
  if (!user) return { error: NextResponse.json({ error: "Sessão expirada." }, { status: 401 }) };
  if (user.role !== "admin" || (write && !sameOrigin(request)))
    return { error: NextResponse.json({ error: "Sem permissão." }, { status: 403 }) };
  return { user };
}
async function managedUser(id: string) {
  const target = id ? await (await store()).user.findUnique({where:{id},select:{id:true,role:true,email:true}}) : null;
  return target && target.role !== "admin" ? target : null;
}
async function auditUser(userId: string, action: string, recordId: string) {
  return (await store()).audit.create({data:{id:randomUUID(),userId,action,entity:"user",recordId,at:new Date().toISOString()}});
}

export const GET = withApiErrors(async (request: NextRequest) => {
  const { error } = await adminOnly(request, false);
  if (error) return error;
  const rows = await (await store()).user.findMany({
    where:{role:{in:clinicalRoles}},
    select:{id:true,email:true,name:true,role:true,active:true,createdAt:true,_count:{select:{records:true}}},
    orderBy:{name:"asc"},
  });
  return NextResponse.json(rows.map(({createdAt,_count,...rest}: any)=>({...rest,created_at:createdAt,records:_count.records})));
});

export const POST = withApiErrors(async (request: NextRequest) => {
  const { user, error } = await adminOnly(request);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const email = safeText(body.email, 254).toLowerCase();
  const name = safeText(body.name, 120);
  const role = safeText(body.role, 20);
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2) return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (!clinicalRoles.includes(role)) return NextResponse.json({ error: "Escolha o perfil: médico, enfermeiro ou técnico de enfermagem." }, { status: 400 });
  if (password.length < MIN_PASSWORD) return NextResponse.json({ error: `A senha inicial precisa ter pelo menos ${MIN_PASSWORD} caracteres.` }, { status: 400 });
  if (await (await store()).user.findUnique({where:{email},select:{id:true}}))
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  const id = randomUUID();
  await (await store()).user.create({data:{id,email,name,role,passwordHash:passwordHash(password),active:1,createdAt:new Date().toISOString()}});
  await auditUser(user.id, "create", id);
  return NextResponse.json({ id }, { status: 201 });
});

// Atualiza dados, perfil, situação e/ou senha. Campos ausentes permanecem como estão.
export const PATCH = withApiErrors(async (request: NextRequest) => {
  const { user, error } = await adminOnly(request);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const target = await managedUser(safeText(body.id, 100));
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  const data: { name?: string; email?: string; role?: string; active?: number; passwordHash?: string } = {};
  if (body.name !== undefined) {
    const name = safeText(body.name, 120);
    if (name.length < 2) return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });
    data.name = name;
  }
  if (body.email !== undefined) {
    const email = safeText(body.email, 254).toLowerCase();
    if (!validEmail(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (email !== target.email && await (await store()).user.findUnique({where:{email},select:{id:true}}))
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    data.email = email;
  }
  if (body.role !== undefined) {
    if (!clinicalRoles.includes(body.role)) return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
    data.role = body.role;
  }
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") return NextResponse.json({ error: "Situação inválida." }, { status: 400 });
    data.active = body.active ? 1 : 0;
  }
  if (body.password !== undefined && body.password !== "") {
    if (typeof body.password !== "string" || body.password.length < MIN_PASSWORD)
      return NextResponse.json({ error: `A nova senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.` }, { status: 400 });
    data.passwordHash = passwordHash(body.password);
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nenhuma alteração informada." }, { status: 400 });
  // Mudança de acesso (senha, perfil, e-mail ou desativação) encerra as sessões abertas da conta.
  const endSessions = data.passwordHash || data.role || data.email || data.active === 0;
  await (await store()).$transaction(async (tx: any) => {
    await tx.user.update({where:{id:target.id},data});
    if (endSessions) await tx.session.deleteMany({where:{userId:target.id}});
  });
  const action = data.active === 0 ? "deactivate" : data.active === 1 ? "activate" : data.passwordHash && Object.keys(data).length === 1 ? "reset_password" : "update";
  await auditUser(user.id, action, target.id);
  return NextResponse.json({ ok: true });
});

// Exclui apenas contas sem registros clínicos; com registros, a conta deve ser desativada para preservar autoria.
export const DELETE = withApiErrors(async (request: NextRequest) => {
  const { user, error } = await adminOnly(request);
  if (error) return error;
  const target = await managedUser(safeText(request.nextUrl.searchParams.get("id"), 100));
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (await (await store()).clinicalRecord.count({where:{authorId:target.id}}))
    return NextResponse.json({ error: "Este usuário possui registros clínicos e não pode ser excluído. Desative a conta para bloquear o acesso." }, { status: 409 });
  await (await store()).$transaction(async (tx: any) => {
    await tx.session.deleteMany({where:{userId:target.id}});
    await tx.user.delete({where:{id:target.id}});
  });
  await auditUser(user.id, "delete", target.id);
  return NextResponse.json({ ok: true });
});
