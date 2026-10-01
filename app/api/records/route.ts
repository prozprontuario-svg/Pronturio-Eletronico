import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { canWrite, clinicalDenied, clinicalUser, sameOrigin } from "@/lib/auth";
import { clinicalTypes, safeText } from "@/lib/validation";
import { prisma, recordFromPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const { user, status } = await clinicalUser(request);
  if (!user) return clinicalDenied(status);
  const patientId = safeText(request.nextUrl.searchParams.get("patient"), 100);
  const type = safeText(request.nextUrl.searchParams.get("type"), 50);
  if (!(await prisma().patient.findUnique({where:{id:patientId},select:{id:true}})))
    return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
  const rows = type && clinicalTypes.has(type)
    ? await prisma().clinicalRecord.findMany({where:{patientId,type},orderBy:{createdAt:"desc"}})
    : await prisma().clinicalRecord.findMany({where:{patientId},orderBy:{createdAt:"desc"}});
  return NextResponse.json(rows.map((row) => ({ ...recordFromPrisma(row), data: JSON.parse(row.data) })));
}
export async function POST(request: NextRequest) {
  const { user, status: denied } = await clinicalUser(request);
  if (!user) return clinicalDenied(denied);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const patientId = safeText(body.patientId, 100);
  const type = safeText(body.type, 50);
  if (!(await prisma().patient.findUnique({where:{id:patientId},select:{id:true}})) || !clinicalTypes.has(type))
    return NextResponse.json({ error: "Paciente ou tipo inválido." }, { status: 400 });
  if (!canWrite(user.role, type)) return NextResponse.json({ error: "Sem permissão para registrar nesta área." }, { status: 403 });
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data))
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(body.data)) {
    if (Object.keys(data).length >= 60) break;
    if (key.length <= 100 && key.length > 0 && !/[\u0000-\u001f<>]/.test(key) && typeof value === "string")
      data[key] = value.trim().slice(0, 5000);
  }
  if (!Object.values(data).some(Boolean)) return NextResponse.json({ error: "Preencha ao menos um campo." }, { status: 400 });
  const status = body.status === "draft" ? "draft" : "confirmed";
  const id = randomUUID();
  const now = new Date().toISOString();
  await prisma().$transaction(async (tx) => {
    await tx.clinicalRecord.create({data:{
      id,patientId,type,data:JSON.stringify(data),status,authorId:user.id,createdAt:now,updatedAt:now,
    }});
    await tx.audit.create({data:{id:randomUUID(),userId:user.id,
      action:status === "draft" ? "save_draft" : "create",entity:type,recordId:id,at:now}});
    if (["alergias","triagem"].includes(type) && status === "confirmed") {
      const allergies = safeText(data.Alergia || data.Alergias || "", 1000);
      const risks = safeText(data.Risco || data.Riscos || data["Risco de queda"] || "", 1000);
      if (allergies || risks) await tx.patient.update({where:{id:patientId},data:{
        ...(allergies?{allergies}:{}),...(risks?{risks}:{}),
      }});
    }
    if (type === "admissao" && status === "confirmed") {
      const ward = safeText(data.Setor || "", 80);
      const bed = safeText(data.Leito || "", 20);
      if (ward || bed) await tx.patient.update({where:{id:patientId},data:{...(ward?{ward}:{}),...(bed?{bed}:{})}});
    }
    if (type === "saida" && status === "confirmed") {
      const state = safeText(data.Tipo || data["Tipo de saída *"] || "Alta hospitalar", 60);
      await tx.patient.update({where:{id:patientId},data:{status:state}});
    }
  });
  return NextResponse.json({ id }, { status: 201 });
}
