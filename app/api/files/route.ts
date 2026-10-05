import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { canWrite, clinicalDenied, clinicalUser, sameOrigin } from "@/lib/auth";
import { safeText } from "@/lib/validation";
import { store } from "@/lib/json-db";
import { uploadsPath } from "@/lib/storage";
import { withApiErrors } from "@/lib/api";

export const runtime = "nodejs";
const permitted = new Set(["application/pdf","image/png","image/jpeg","image/webp"]);
export const POST = withApiErrors(async (request: NextRequest) => {
  const { user, status } = await clinicalUser(request);
  if (!user) return clinicalDenied(status);
  if (!canWrite(user.role, "documentos")) return NextResponse.json({error:"Sem permissão."},{status:403});
  if (!user || !sameOrigin(request)) return NextResponse.json({error:"Sem permissão."},{status:403});
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const patientId = safeText(form?.get("patient"),100);
  const category = safeText(form?.get("category"),30);
  if (!(file instanceof File) || !(await (await store()).patient.findUnique({where:{id:patientId},select:{id:true}})))
    return NextResponse.json({error:"Arquivo ou paciente inválido."},{status:400});
  if (file.size === 0 || file.size > 10*1024*1024 || !permitted.has(file.type))
    return NextResponse.json({error:"Envie PDF ou imagem com até 10 MB."},{status:400});
  const id = randomUUID();
  const bytes = await file.arrayBuffer();
  await fs.mkdir(uploadsPath(),{recursive:true});
  await fs.writeFile(path.join(uploadsPath(),id),Buffer.from(bytes),{flag:"wx"});
  const data = JSON.stringify({Arquivo:file.name.slice(0,180),ArquivoID:id,Tipo:file.type,
    Categoria:["Termos","Laudos","Exames","Imagens","Outros"].includes(category)?category:"Outros"});
  const now = new Date().toISOString();
  await (await store()).$transaction(async(tx: any)=>{
    await tx.clinicalRecord.create({data:{id,patientId,type:"documentos",data,status:"confirmed",authorId:user.id,createdAt:now,updatedAt:now}});
    await tx.audit.create({data:{id:randomUUID(),userId:user.id,action:"upload",entity:"documentos",recordId:id,at:now}});
  });
  return NextResponse.json({id,name:file.name},{status:201});
});
