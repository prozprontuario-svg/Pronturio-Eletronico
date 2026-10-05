import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { audit } from "@/lib/db";
import { clinicalDenied, clinicalUser, sameOrigin } from "@/lib/auth";
import { safeText } from "@/lib/validation";
import { patientFrom, store } from "@/lib/json-db";
import { withApiErrors } from "@/lib/api";

export const runtime = "nodejs";
export const GET = withApiErrors(async (request: NextRequest) => {
  const { user, status } = await clinicalUser(request);
  if (!user) return clinicalDenied(status);
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const patient = await (await store()).patient.findUnique({ where: { id } });
    return patient ? NextResponse.json(patientFrom(patient)) : NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
  }
  const query = safeText(request.nextUrl.searchParams.get("q"), 120);
  const filter = safeText(request.nextUrl.searchParams.get("filter"), 30);
  const rows = await (await store()).patient.findMany({
    where: {
      OR: [{name:{contains:query}},{chart:{contains:query}},{document:{contains:query}}],
      ...(filter === "internados" ? {status:{startsWith:"Internad"}} : filter === "observacao" ? {status:"Em observação"} : {}),
    },
    orderBy:{name:"asc"},take:100,
  });
  return NextResponse.json(rows.map(patientFrom));
});
export const POST = withApiErrors(async (request: NextRequest) => {
  const { user, status } = await clinicalUser(request);
  if (!user) return clinicalDenied(status);
  if (!user || !sameOrigin(request)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const name = safeText(body.name, 120);
  const birth = safeText(body.birth, 10);
  const sex = safeText(body.sex, 30);
  const mother = safeText(body.mother, 120);
  const document = safeText(body.document, 40);
  if (name.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(birth) || !sex || !mother || !document)
    return NextResponse.json({ error: "Preencha os campos obrigatórios de identificação." }, { status: 400 });
  const id = randomUUID();
  const seq = await (await store()).patient.count() + 124;
  const chart = `PS-${String(seq).padStart(5, "0")}`;
  await (await store()).patient.create({data:{
    id,chart,name,birth,sex,mother,father:safeText(body.father,120),document,
    phone:safeText(body.phone,30),zip:safeText(body.zip,20),
    address:safeText(body.address,200),city:safeText(body.city,100),
    createdAt:new Date().toISOString(),
  }});
  await audit(user.id, "create", "patient", id);
  return NextResponse.json({ id, chart }, { status: 201 });
});
