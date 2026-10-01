import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { clinicalDenied, clinicalUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadsPath } from "@/lib/storage";
export const runtime = "nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {user,status}=await clinicalUser(request);
  if(!user) return clinicalDenied(status);
  const {id}=await params;
  if(!/^[a-f0-9-]{36}$/.test(id)) return NextResponse.json({error:"Arquivo inválido."},{status:400});
  const row=await prisma().clinicalRecord.findFirst({where:{id,type:"documentos"}});
  if(!row) return NextResponse.json({error:"Arquivo não encontrado."},{status:404});
  const meta=JSON.parse(row.data) as {Arquivo:string;Tipo:string};
  try{
    const bytes=await fs.readFile(path.join(uploadsPath(),id));
    return new NextResponse(bytes,{headers:{
      "Content-Type":meta.Tipo,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(meta.Arquivo)}`,
      "X-Content-Type-Options":"nosniff",
    }});
  }catch{return NextResponse.json({error:"Arquivo não encontrado."},{status:404});}
}
