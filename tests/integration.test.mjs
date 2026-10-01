import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const base = "http://127.0.0.1:3101";
async function waitReady(proc) {
  let output="";
  let last="";
  proc.stdout?.on("data",(chunk)=>{output+=String(chunk).slice(-2000);});
  proc.stderr?.on("data",(chunk)=>{output+=String(chunk).slice(-2000);});
  for (let i=0;i<80;i++) {
    if (proc.exitCode !== null) throw new Error(`Servidor encerrou antes dos testes. ${output}`);
    try {
      const response=await fetch(base+"/");
      if(response.ok) return;
      last=`${response.status} ${(await response.text()).slice(0,300)}`;
    } catch(error) { last=String(error); }
    await new Promise((resolve)=>setTimeout(resolve,500));
  }
  throw new Error(`Servidor não iniciou. ${output} / ${last}`);
}
async function json(url, method="GET", body, cookie) {
  const response=await fetch(base+url,{method,redirect:"manual",headers:{
    "Content-Type":"application/json",Origin:base,...(cookie?{Cookie:cookie}:{})
  },...(body?{body:JSON.stringify(body)}:{})});
  return {response,data:await response.json().catch(()=>null)};
}
test("fluxo local de autenticação, autorização e registro clínico", async () => {
  const dir=await mkdtemp(path.join(tmpdir(),"proz-test-"));
  const proc=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p","3101","--hostname","127.0.0.1"],{
    cwd:process.cwd(),env:{...process.env,DATABASE_PATH:path.join(dir,"test.sqlite"),ADMIN_EMAIL:"admin@hospital.local",ADMIN_PASSWORD:"SenhaLocal123!",ADMIN_NAME:"Admin Local",UPLOADS_PATH:path.join(dir,"uploads")},stdio:["ignore","pipe","pipe"]
  });
  try {
    await waitReady(proc);
    const blocked=await fetch(base+"/app/inicio",{redirect:"manual"});
    assert.equal(blocked.status,307);
    const setupGone=await fetch(base+"/setup",{redirect:"manual"});
    assert.equal(setupGone.status,404);
    const wrong=await json("/api/auth","POST",{email:"admin@hospital.local",password:"errada"});
    assert.equal(wrong.response.status,401);
    const login=await json("/api/auth","POST",{email:"admin@hospital.local",password:"SenhaLocal123!"});
    assert.equal(login.response.status,200);
    assert.equal(login.data.role,"admin");
    const adminCookie=login.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(adminCookie?.startsWith("proz_session="));
    assert.match(login.response.headers.get("set-cookie")||"",/HttpOnly/i);
    // Administrador: somente painel de contas.
    const adminHome=await fetch(base+"/app/inicio",{redirect:"manual",headers:{Cookie:adminCookie}});
    assert.equal(adminHome.status,307);
    assert.match(adminHome.headers.get("location")||"",/\/app\/admin$/);
    assert.equal((await fetch(base+"/app/admin",{headers:{Cookie:adminCookie}})).status,200);
    assert.equal((await json("/api/patients","GET",undefined,adminCookie)).response.status,403);
    assert.equal((await json("/api/records","POST",{patientId:"pac-maria",type:"enfermagem",data:{"Anotação *":"x"}},adminCookie)).response.status,403);
    assert.equal((await json("/api/users","GET",undefined,adminCookie)).data.length,0,"Não deve haver usuários pré-cadastrados");
    // CRUD de contas.
    assert.equal((await json("/api/users","POST",{name:"Outro Admin",email:"outro@hospital.local",role:"admin",password:"SenhaLocal123!"},adminCookie)).response.status,400);
    assert.equal((await json("/api/users","POST",{name:"Curta",email:"curta@hospital.local",role:"tecnico",password:"curta"},adminCookie)).response.status,400);
    const temp=await json("/api/users","POST",{name:"Conta Temporária",email:"temp@hospital.local",role:"medico",password:"SenhaTemporaria1!"},adminCookie);
    assert.equal(temp.response.status,201);
    assert.equal((await json("/api/users","POST",{name:"Duplicada",email:"temp@hospital.local",role:"medico",password:"SenhaTemporaria1!"},adminCookie)).response.status,409);
    const edited=await json("/api/users","PATCH",{id:temp.data.id,name:"Conta Editada",email:"editada@hospital.local",role:"enfermeiro",password:"NovaSenhaSegura1!"},adminCookie);
    assert.equal(edited.response.status,200);
    const listed=(await json("/api/users","GET",undefined,adminCookie)).data.find((u)=>u.id===temp.data.id);
    assert.equal(listed.name,"Conta Editada"); assert.equal(listed.email,"editada@hospital.local"); assert.equal(listed.role,"enfermeiro");
    assert.equal((await json("/api/auth","POST",{email:"editada@hospital.local",password:"SenhaTemporaria1!"})).response.status,401);
    const editedLogin=await json("/api/auth","POST",{email:"editada@hospital.local",password:"NovaSenhaSegura1!"});
    assert.equal(editedLogin.response.status,200);
    const editedCookie=editedLogin.response.headers.get("set-cookie")?.split(";")[0];
    assert.equal((await json("/api/users","PATCH",{id:temp.data.id,active:false},adminCookie)).response.status,200);
    assert.equal((await json("/api/patients","GET",undefined,editedCookie)).response.status,401,"Sessão deve cair ao desativar");
    assert.equal((await json("/api/auth","POST",{email:"editada@hospital.local",password:"NovaSenhaSegura1!"})).response.status,401);
    assert.equal((await json("/api/users","PATCH",{id:"admin",active:false},adminCookie)).response.status,404,"Admin não é gerenciável pelo painel");
    assert.equal((await json(`/api/users?id=${temp.data.id}`,"DELETE",undefined,adminCookie)).response.status,200);
    assert.ok(!(await json("/api/users","GET",undefined,adminCookie)).data.some((u)=>u.id===temp.data.id));
    const create=await json("/api/users","POST",{name:"Técnico Local",email:"tecnico@hospital.local",role:"tecnico",password:"SenhaTecnico123!"},adminCookie);
    assert.equal(create.response.status,201);
    const techLogin=await json("/api/auth","POST",{email:"tecnico@hospital.local",password:"SenhaTecnico123!"});
    assert.equal(techLogin.response.status,200);
    const techCookie=techLogin.response.headers.get("set-cookie")?.split(";")[0];
    const home=await fetch(base+"/app/inicio",{redirect:"manual",headers:{Cookie:techCookie}});
    assert.equal(home.status,200);
    const missingContext=await fetch(base+"/app/resumo",{redirect:"manual",headers:{Cookie:techCookie}});
    assert.equal(missingContext.status,307);
    assert.match(missingContext.headers.get("location")||"",/\/app\/pacientes$/);
    const invalidContext=await fetch(base+"/app/resumo?patient=nao-existe",{redirect:"manual",headers:{Cookie:techCookie}});
    assert.equal(invalidContext.status,307);
    assert.match(invalidContext.headers.get("location")||"",/\/app\/pacientes$/);
    const manifest=JSON.parse(await readFile("docs/figma/manifest.json","utf8"));
    const slugs=[...new Set(manifest.screens.map((screen)=>screen.slug))].filter((slug)=>!["login","senha","senha-enviada"].includes(slug));
    for(const slug of slugs){
      const screen=await fetch(base+`/app/${slug}?patient=pac-maria`,{redirect:"manual",headers:{Cookie:techCookie}});
      assert.equal(screen.status,200,`Tela ${slug} não abriu`);
    }
    const newPatient=await json("/api/patients","POST",{
      name:"Paciente Fictício",birth:"2001-02-03",sex:"Masculino",mother:"Mãe Fictícia",document:"TESTE-004"
    },techCookie);
    assert.equal(newPatient.response.status,201);
    const patientRead=await json(`/api/patients?id=${newPatient.data.id}`,"GET",undefined,techCookie);
    assert.equal(patientRead.data.name,"Paciente Fictício");
    const denied=await json("/api/users","GET",undefined,techCookie);
    assert.equal(denied.response.status,403);
    const deniedAdminPage=await fetch(base+"/app/admin",{redirect:"manual",headers:{Cookie:techCookie}});
    assert.equal(deniedAdminPage.status,307);
    assert.match(deniedAdminPage.headers.get("location")||"",/\/app\/permissao$/);
    const adminDenied=await fetch(base+"/app/admin",{redirect:"manual",headers:{Cookie:techCookie}});
    assert.equal(adminDenied.status,307);
    const patients=await json("/api/patients","GET",undefined,techCookie);
    assert.equal(patients.response.status,200);
    assert.ok(patients.data.some((p)=>p.id==="pac-maria"));
    const forbidden=await json("/api/records","POST",{patientId:"pac-maria",type:"anamnese",data:{Texto:"Teste"}},techCookie);
    assert.equal(forbidden.response.status,403);
    const surgeryForbidden=await json("/api/records","POST",{patientId:"pac-maria",type:"cirurgia",data:{Procedimento:"Teste"}},techCookie);
    assert.equal(surgeryForbidden.response.status,403);
    const note=await json("/api/records","POST",{patientId:"pac-maria",type:"enfermagem",data:{"Anotação *":"Registro fictício"}},techCookie);
    assert.equal(note.response.status,201);
    const records=await json("/api/records?patient=pac-maria&type=enfermagem","GET",undefined,techCookie);
    assert.equal(records.response.status,200);
    assert.ok(records.data.some((r)=>r.data["Anotação *"]==="Registro fictício"));
    const signs=await json("/api/records","POST",{patientId:newPatient.data.id,type:"sinais",
      data:{"PA sistólica • mmHg":"120","PA diastólica • mmHg":"80"}},techCookie);
    assert.equal(signs.response.status,201);
    const history=await json(`/api/records?patient=${newPatient.data.id}`,"GET",undefined,techCookie);
    assert.ok(history.data.some((r)=>r.type==="sinais"));
    const uploadData=new FormData();
    uploadData.append("patient",newPatient.data.id);
    uploadData.append("file",new Blob(["%PDF-1.4\n%%EOF"],{type:"application/pdf"}),"teste.pdf");
    const uploaded=await fetch(base+"/api/files",{method:"POST",headers:{Origin:base,Cookie:techCookie},body:uploadData});
    assert.equal(uploaded.status,201);
    const fileId=(await uploaded.json()).id;
    const downloaded=await fetch(base+`/api/files/${fileId}`,{headers:{Cookie:techCookie}});
    assert.equal(downloaded.status,200);
    assert.match(downloaded.headers.get("content-type")||"",/application\/pdf/);
    const login_=async(email,password)=>(await json("/api/auth","POST",{email,password})).response.headers.get("set-cookie")?.split(";")[0];
    assert.equal((await json("/api/users","POST",{name:"Médica Local",email:"medica@hospital.local",role:"medico",password:"SenhaMedica123!"},adminCookie)).response.status,201);
    assert.equal((await json("/api/users","POST",{name:"Enfermeiro Local",email:"enfermeiro@hospital.local",role:"enfermeiro",password:"SenhaEnfermeiro123!"},adminCookie)).response.status,201);
    const doctorCookie=await login_("medica@hospital.local","SenhaMedica123!");
    const nurseCookie=await login_("enfermeiro@hospital.local","SenhaEnfermeiro123!");
    const pid=newPatient.data.id;
    for (const [type,data] of [
      ["anamnese",{"Queixa principal":"Queixa fictícia"}],
      ["exame-fisico",{"Estado geral":"Bom estado geral"}],
      ["exames",{"Exame solicitado":"Hemograma","Prioridade":"Rotina"}],
      ["resultado",{"Exame":"Hemograma","Data do resultado":"30/09/2026","Resultado / laudo":"Dentro da referência"}],
      ["prescricao",{"Medicamento / cuidado":"Soro fisiológico","Dose":"500 mL","Via":"Endovenosa","Frequência":"12/12 h"}],
      ["cirurgia",{"Procedimento":"Procedimento fictício","Data":"01/10/2026","Sala":"02","Equipe":"Equipe A","Situação":"Programado"}],
    ]) {
      const created=await json("/api/records","POST",{patientId:pid,type,data},doctorCookie);
      assert.equal(created.response.status,201,`Médico não registrou ${type}`);
    }
    const techPrescription=await json("/api/records","POST",{patientId:pid,type:"prescricao",data:{"Medicamento / cuidado":"X"}},techCookie);
    assert.equal(techPrescription.response.status,403);
    const check=await json("/api/records","POST",{patientId:pid,type:"checagem",
      data:{"Item da prescrição *":"Soro fisiológico • 500 mL","Situação *":"Realizado","Data e hora do registro *":"30/09/2026 10:00"}},nurseCookie);
    assert.equal(check.response.status,201);
    const admission=await json("/api/records","POST",{patientId:pid,type:"admissao",
      data:{"Motivo da internação":"Observação clínica","Setor":"Enfermaria B","Leito":"07"}},nurseCookie);
    assert.equal(admission.response.status,201);
    const allergies=await json("/api/records","POST",{patientId:pid,type:"alergias",data:{"Alergias":"Látex","Riscos":"Risco de queda"}},nurseCookie);
    assert.equal(allergies.response.status,201);
    let updated=(await json(`/api/patients?id=${pid}`,"GET",undefined,nurseCookie)).data;
    assert.equal(updated.ward,"Enfermaria B");
    assert.equal(updated.bed,"07");
    assert.equal(updated.allergies,"Látex");
    const surgeryList=await fetch(base+"/app/cirurgias",{headers:{Cookie:doctorCookie}});
    assert.match(await surgeryList.text(),/Procedimento fictício/);
    for (const slug of ["anamnese","exames","prescricao","checagem","cirurgia","admissao","alergias","resultado"]) {
      const page=await fetch(base+`/app/${slug}?patient=${pid}`,{headers:{Cookie:doctorCookie}});
      assert.equal(page.status,200,`Tela ${slug} do novo paciente não abriu`);
    }
    const discharge=await json("/api/records","POST",{patientId:pid,type:"saida",
      data:{"Tipo de saída *":"Alta hospitalar","Data e hora *":"30/09/2026 18:00","Responsável *":"Médica Local"}},doctorCookie);
    assert.equal(discharge.response.status,201);
    updated=(await json(`/api/patients?id=${pid}`,"GET",undefined,doctorCookie)).data;
    assert.equal(updated.status,"Alta hospitalar");
    const techId=(await json("/api/users","GET",undefined,adminCookie)).data.find((u)=>u.email==="tecnico@hospital.local").id;
    const blockedDelete=await json(`/api/users?id=${techId}`,"DELETE",undefined,adminCookie);
    assert.equal(blockedDelete.response.status,409);
    const logout=await json("/api/auth","DELETE",undefined,techCookie);
    assert.equal(logout.response.status,200);
    const after=await json("/api/records?patient=pac-maria","GET",undefined,techCookie);
    assert.equal(after.response.status,401);
  } finally {
    proc.kill();
    if (proc.exitCode === null) await once(proc,"exit");
    for(let i=0;i<10;i++){
      try { await rm(dir,{recursive:true,force:true}); break; }
      catch(error){if(i===9) throw error; await new Promise((resolve)=>setTimeout(resolve,300));}
    }
  }
});
