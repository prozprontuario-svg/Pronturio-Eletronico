import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { clinicalDenied, clinicalUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadsPath } from "@/lib/storage";
import { filesBucket, isCloudflareWorker } from "@/lib/cloudflare";
import { withApiErrors } from "@/lib/api";
export const runtime = "nodejs";
export const GET = withApiErrors(async (request:NextRequest,{params}:{params:Promise<{id:string}>}) => {
  const {user,status}=await clinicalUser(request);
  if(!user) return clinicalDenied(status);
  const {id}=await params;
  if(!/^[a-f0-9-]{36}$/.test(id)) return NextResponse.json({error:"Arquivo inválido."},{status:400});
  const row=await (await prisma()).clinicalRecord.findFirst({where:{id,type:"documentos"}});
  if(!row) return NextResponse.json({error:"Arquivo não encontrado."},{status:404});
  const meta=JSON.parse(row.data) as {Arquivo:string;Tipo:string};
  const bucket = filesBucket();
  let bytes: ArrayBuffer | Buffer;
  if (bucket) {
    const object = await bucket.get(id);
    if (!object) return NextResponse.json({error:"Arquivo não encontrado."},{status:404});
    bytes = await object.arrayBuffer();
  } else {
    if (isCloudflareWorker()) throw new Error("Binding R2 FILES não configurado.");
    try { bytes = await fs.readFile(path.join(uploadsPath(),id)); }
    catch { return NextResponse.json({error:"Arquivo não encontrado."},{status:404}); }
  }
  return new NextResponse(bytes instanceof ArrayBuffer ? bytes : Uint8Array.from(bytes),{headers:{
      "Content-Type":meta.Tipo,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(meta.Arquivo)}`,
      "X-Content-Type-Options":"nosniff",
    }});
});
