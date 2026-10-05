"use client";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as Lucide from "lucide-react";
import type { DesignNode } from "@/lib/design";
import type { Patient, Role } from "@/lib/db";
import { canWrite } from "@/lib/permissions";
import { patientSections } from "@/lib/navigation";
import { Brand } from "@/components/Brand";
import { SetembroAmarelo } from "@/components/SetembroAmarelo";

type Screen = { key: string; title: string; device: "Desktop" | "Mobile"; resolved: DesignNode };
type ClinicalRecord = { id: string; type: string; status: string; data: Record<string,string>; created_at: string; author_id: string; author_name: string };
type Props = {
  slug: string; screens: Screen[]; offlineScreens: Screen[]; user: { id: string; name: string; email?: string; role: Role };
  patient: Patient | null; patients: Patient[]; records: ClinicalRecord[];
  stats: { admitted:number; drafts:number; surgeries:number };
  surgeries: {id:string;patient:Patient;data:Record<string,string>}[];
  now: string;
  openSection?: string;
  setembroHero?: string;
  initialCollapsed?: boolean | null;
  initialPatientFilter?: "internados" | "todos";
};
const colors: Record<string,string> = {
  brand:"var(--brand)","brand-dark":"var(--brand-dark)","yellow-soft":"var(--yellow-soft)",yellow:"var(--yellow)",
  white:"var(--white)",background:"var(--background)",text:"var(--text)",muted:"var(--muted)",border:"var(--border)",
  "brand-soft":"var(--brand-soft)",allergy:"var(--allergy)","allergy-soft":"var(--allergy-soft)",amber:"var(--amber)",
  success:"var(--success)",disabled:"var(--disabled)",
};
const selectors: Record<string,string[]> = {
  "Sexo *":["Feminino","Masculino","Outro","Não informado"],
  "Município / UF":["São Paulo / SP","Campinas / SP","Rio de Janeiro / RJ","Outro"],
  "Dor • 0 a 10":["Não aferida",...Array.from({length:11},(_,i)=>String(i))],
  "Situação *":["Realizado","Não realizado","Pendente"],
  "Situação":["Todas","Programado","Em preparo","Concluído","Cancelado"],
  "Categoria":["Todos os documentos","Termos","Laudos","Exames","Imagens","Outros"],
  "Tamanho do texto":["Padrão","Grande","Muito grande"],
  "Tipo de saída *":["Alta hospitalar","Transferência","Óbito"],
};
const reviewSources: Record<string,string> = {
  "revisao-cadastro":"cadastro", "revisar-anotacao":"nova-anotacao",
  "revisao-sinais":"registrar-sinais", "revisao-checagem":"checagem", "revisao-saida":"saida",
};
const clinicalTarget: Record<string,string> = {
  "nova-anotacao":"enfermagem","registrar-sinais":"sinais","revisar-anotacao":"enfermagem",
  "revisao-sinais":"sinais","revisao-checagem":"checagem","revisao-saida":"saida",
};
// Itens fora do menu lateral (layout aprovado). Continuam acessíveis pelo Acesso rápido do Início,
// pelos atalhos de cada paciente na lista e pelas abas do prontuário.
const sidebarHidden = new Set(["triagem","enfermagem","exames"]);
const patientShortcuts = [["triagem","Triagem"],["enfermagem","Enfermagem"],["exames","Exames"]] as const;
const sectionNames: Record<string,string> = { resumo:"o prontuário", triagem:"a Triagem", enfermagem:"a Enfermagem", exames:"os Exames" };
const formScreens = new Set(["nova-anotacao","registrar-sinais","checagem","saida"]);
const sampleOnlyScreens =new Set(["identificacao","admissao","anamnese","exame-fisico","exames","resultado","prescricao","procedimentos","cirurgia","alergias"]);
type EntryField = { label: string; kind?: "textarea" | "select"; options?: string[]; hint?: string };
// Telas que no design só exibem dados: o formulário abaixo permite registrar com a mesma autorização da API.
// Campos que já existem na tela (ReadOnly) passam a ser editáveis no lugar; os demais aparecem no painel de registro.
// `revise` indica documento único do paciente: o formulário parte do último registro e grava uma nova versão.
const entryForms: Record<string,{ title: string; button: string; fields: EntryField[]; required: string[]; revise?: boolean }> = {
  anamnese: { title:"Registrar anamnese", button:"Salvar anamnese", revise:true, required:["Queixa principal"],
    fields:["Queixa principal","HDA • História da doença atual","HPP • História patológica pregressa","Histórico familiar",
      "Histórico social e hábitos","Medicamentos de uso contínuo"].map((label) => ({ label, kind:"textarea" as const })) },
  "exame-fisico": { title:"Registrar exame físico", button:"Salvar exame físico", revise:true, required:["Estado geral"],
    fields:["Estado geral","Cabeça e pescoço","Aparelho respiratório","Cardiovascular","Abdome","Neurológico","Extremidades",
      "Outras alterações"].map((label) => ({ label, kind:"textarea" as const })) },
  admissao: { title:"Registrar admissão", button:"Salvar admissão", revise:true, required:["Motivo da internação"],
    fields:[{label:"Motivo da internação",kind:"textarea"},{label:"Setor"},{label:"Leito"},{label:"Observações",kind:"textarea"}] },
  alergias: { title:"Atualizar alergias e riscos", button:"Salvar alergias e riscos", revise:true, required:[],
    fields:[{label:"Alergias",hint:"Ex.: nega alergias conhecidas"},{label:"Riscos",hint:"Ex.: risco de queda"}] },
  exames: { title:"Solicitar exame", button:"Solicitar exame", required:["Exame solicitado"],
    fields:[{label:"Exame solicitado"},{label:"Tipo",kind:"select",options:["Laboratorial","Imagem","Outro"]},
      {label:"Prioridade",kind:"select",options:["Rotina","Urgente"]},{label:"Justificativa",kind:"textarea"}] },
  resultado: { title:"Registrar resultado", button:"Salvar resultado", required:["Exame","Data do resultado","Resultado / laudo"],
    fields:[{label:"Exame"},{label:"Data do resultado",hint:"dd/mm/aaaa"},{label:"Resultado / laudo",kind:"textarea"},
      {label:"Observações",kind:"textarea"}] },
  prescricao: { title:"Nova prescrição", button:"Salvar prescrição", required:["Medicamento / cuidado","Dose","Via","Frequência"],
    fields:[{label:"Medicamento / cuidado"},{label:"Dose"},
      {label:"Via",kind:"select",options:["Oral","Endovenosa","Intramuscular","Subcutânea","Inalatória","Tópica","Outra"]},
      {label:"Frequência",hint:"Ex.: 8/8 h"},{label:"Observações",kind:"textarea"}] },
  cirurgia: { title:"Programar cirurgia", button:"Salvar programação", required:["Procedimento","Data"],
    fields:[{label:"Procedimento"},{label:"Data",hint:"dd/mm/aaaa"},{label:"Horário",hint:"hh:mm"},{label:"Sala"},{label:"Equipe"},
      {label:"Situação",kind:"select",options:["Programado","Em preparo","Concluído","Cancelado"]},
      {label:"Orientações registradas",kind:"textarea"}] },
};
const typeNames: Record<string,string> = {
  triagem:"Triagem",sinais:"Sinais vitais",anamnese:"Anamnese","exame-fisico":"Exame físico",exames:"Exame solicitado",
  resultado:"Resultado de exame",prescricao:"Prescrição",checagem:"Checagem de medicação",enfermagem:"Anotação de enfermagem",
  procedimentos:"Procedimento",cirurgia:"Cirurgia",documentos:"Documento",saida:"Saída hospitalar",alergias:"Alergias e riscos",
  admissao:"Admissão",
};
const PRESCRIPTION_ITEM = "Item da prescrição *";
function dateBR(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
function normalizeDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}
// Textos herdados do design que indicavam ambiente de demonstração não são exibidos.
const DEMO_TEXT = /demonstraç|fict[ií]ci|acad[eê]mic/i;
const demoReplacements: Record<string,string> = {
  "Prontuário eletrônico hospitalar • Projeto acadêmico":"Prontuário eletrônico hospitalar",
  "Dado fictício":"Não informado", "Registro de demonstração":"Não informado", "Endereço de demonstração":"Não informado",
};
function cleanDemo(text: string) { return DEMO_TEXT.test(text) ? demoReplacements[text] ?? null : text; }
function findText(node: DesignNode): string {
  if (node.kind === "text") return node.text || "";
  for (const child of node.children || []) { const text = findText(child); if (text) return text; }
  return "";
}
function findTarget(node: DesignNode, target: string): DesignNode | undefined {
  if (node.target === target) return node;
  for (const child of node.children || []) { const found = findTarget(child, target); if (found) return found; }
  return undefined;
}
// Copia um botão do design trocando destino e rótulo (mantém o mesmo componente visual).
function relabel(node: DesignNode, target: string, label: string): DesignNode {
  const copy = JSON.parse(JSON.stringify(node)) as DesignNode;
  copy.target = target; copy.name = label; if (copy.over) copy.over = {...copy.over, Label:label};
  (function walk(item: DesignNode) { if (item.kind === "text") item.text = label; item.children?.forEach(walk); })(copy);
  return copy;
}
function draftKey(slug: string, patientId: string) { return `proz:draft:${slug}:${patientId}`; }
// Faixas de layout: celular (< 700 px) usa a composição Mobile do design; tablet em pé (700–1023 px)
// usa a composição Desktop com menu lateral compacto; tablet deitado e desktop usam o menu completo.
function useMedia(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = matchMedia(query);
    const update = () => setMatches(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}
export function DesignScreen({ slug, screens, offlineScreens, user, patient, patients, records, stats, surgeries, now, openSection, setembroHero = "", initialCollapsed = null, initialPatientFilter = "internados" }: Props) {
  const router = useRouter();
  const mobile = useMedia("(max-width: 699px)");
  const compact = useMedia("(max-width: 1023px)");
  const [form, setForm] = useState<Record<string,string>>({});
  const [loadedDraftKey, setLoadedDraftKey] = useState("");
  const [hasNoteDraft, setHasNoteDraft] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"internados"|"todos"|"observacao">(initialPatientFilter);
  const [collapsedChoice, setCollapsed] = useState<boolean|null>(initialCollapsed);
  const collapsed = collapsedChoice ?? compact;
  function setSidebarCollapsed(value: boolean) {
    setCollapsed(value);
    localStorage.setItem(`proz:sidebar-collapsed:${user.id}`, String(value));
    document.cookie = `proz_sidebar_${user.id}=${value ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
  const [notice, setNotice] = useState<{message:string;kind:"error"|"success"|"info"}|null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const patientId = patient?.id || "";
  const source = reviewSources[slug] || slug;
  const currentDraftKey = draftKey(source, patientId);
  const reviewReady = loadedDraftKey === currentDraftKey;
  const currentDateTime = new Intl.DateTimeFormat("pt-BR", {dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"})
    .format(new Date(now)).replace(",", " •");
  const currentDate = currentDateTime.split(" • ")[0];
  const roleName: Record<Role,string> = {admin:"Administrador",enfermeiro:"Enfermeiro(a)",tecnico:"Técnico(a) de enfermagem",medico:"Médico(a)"};
  const latestRecord = (type: string) => records.find((entry)=>entry.type===type && entry.status==="confirmed");
  const recordDateTime = (entry: ClinicalRecord | undefined) => entry
    ? new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(new Date(entry.created_at)).replace(","," •")
    : "Não registrado";
  const entry = patient ? entryForms[slug] : undefined;
  const entryWritable = !!entry && canWrite(user.role, slug);
  function entryPrefill(label: string) {
    if (!entry?.revise) return "";
    const stored = latestRecord(slug)?.data[label];
    if (stored) return stored;
    if (slug === "alergias") return label === "Alergias" ? patient?.allergies || "" : patient?.risks || "";
    if (slug === "admissao") return label === "Setor" ? patient?.ward || "" : label === "Leito" ? patient?.bed || "" : "";
    return "";
  }
  const entryValue = (label: string) => label in form ? form[label] : entryPrefill(label);
  async function saveEntry() {
    if (!entry) return;
    const data = Object.fromEntries(entry.fields.map(({label}) => [label, entryValue(label).trim()]));
    const missing = entry.required.find((label) => !data[label]);
    if (missing) { inform(`Preencha ${missing}.`,"error"); return; }
    if (!Object.values(data).some(Boolean)) { inform("Preencha ao menos um campo.","error"); return; }
    if (await saveRecord(slug, "confirmed", data)) { inform("Registro salvo.","success"); router.refresh(); }
  }
  const prescriptions = records.filter((entry)=>entry.type==="prescricao" && entry.status==="confirmed");
  const prescriptionLabel = (entry: ClinicalRecord) => [entry.data["Medicamento / cuidado"], entry.data.Dose, entry.data.Via,
    entry.data.Frequência, `prescrito em ${recordDateTime(entry)}`].filter(Boolean).join(" • ");
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    const savedCollapsed = localStorage.getItem(`proz:sidebar-collapsed:${user.id}`);
    if (savedCollapsed !== null) setCollapsed(savedCollapsed === "true");
    const size = localStorage.getItem(`proz:text-size:${user.id}`) || "Padrão";
    document.body.style.zoom = size === "Muito grande" ? "1.2" : size === "Grande" ? "1.1" : "1";
    return () => { document.body.style.zoom = "1"; };
  }, [user.id]);
  useEffect(() => {
    setLoadedDraftKey("");
    try { setForm(JSON.parse(localStorage.getItem(currentDraftKey) || "{}")); }
    catch { setForm({}); }
    setLoadedDraftKey(currentDraftKey);
  }, [currentDraftKey]);
  useEffect(() => {
    if (loadedDraftKey === currentDraftKey) try { localStorage.setItem(currentDraftKey, JSON.stringify(form)); } catch {}
  }, [form, currentDraftKey, loadedDraftKey]);
  useEffect(() => {
    if (slug !== "enfermagem" || !patientId) { setHasNoteDraft(false); return; }
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey("nova-anotacao",patientId)) || "{}") as Record<string,unknown>;
      setHasNoteDraft(Object.values(saved).some((value)=>typeof value === "string" && !!value.trim()));
    } catch { setHasNoteDraft(false); }
  }, [slug,patientId]);
  const activeScreens = offline ? offlineScreens : screens;
  const selected = activeScreens.find((x) => x.device === (mobile ? "Mobile" : "Desktop")) || activeScreens[0];
  const navigate = (target: string, selectedPatient = patientId) => {
    if (patientSections.has(target) && !selectedPatient) {
      router.push(target === "resumo" ? "/app/pacientes" : `/app/pacientes?abrir=${encodeURIComponent(target)}`); return;
    }
    router.push(`/app/${target}${selectedPatient ? `?patient=${encodeURIComponent(selectedPatient)}` : ""}`);
  };
  function inform(message: string, kind: "error"|"success"|"info" = "info") {
    setNotice({message,kind}); setTimeout(() => setNotice(null), 4500);
  }
  async function saveRecord(type: string, status: "draft" | "confirmed" = "confirmed", data = form) {
    if (!patientId) { inform("Selecione um paciente.","error"); return false; }
    if (!canWrite(user.role,type)) { inform("Seu perfil permite consultar esta área, mas não registrar.","error"); return false; }
    setBusy(true);
    const response = await fetch("/api/records", { method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({patientId,type,data,status}) }).catch(() => null);
    setBusy(false);
    const result = response ? await response.json().catch(() => ({error:"Erro interno do servidor"})) : {error:"Sem conexão."};
    if (!response?.ok) {
      if (response?.status === 401) navigate("sessao");
      else inform(result.error || "Erro ao salvar.","error");
      return false;
    }
    if (status === "confirmed") {
      localStorage.removeItem(draftKey(source, patientId));
      setForm({});
    }
    return true;
  }
  async function createPatient() {
    const body = {
      name:form["Nome completo *"], birth:normalizeDate(form["Data de nascimento *"] || ""),
      sex:form["Sexo *"], document:form["CPF ou documento *"], mother:form["Nome da mãe *"],
      father:form["Nome do pai"], phone:form.Telefone, zip:form.CEP,
      address:form.Endereço, city:form["Município / UF"],
    };
    setBusy(true);
    const response = await fetch("/api/patients", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    const result = response ? await response.json().catch(() => ({error:"Erro interno do servidor"})) : {error:"Sem conexão."};
    if (!response?.ok) { inform(result.error || "Não foi possível cadastrar.","error"); return; }
    localStorage.removeItem(draftKey("cadastro", patientId));
    navigate("resumo", result.id);
  }
  function validRequired(current = source) {
    const screen = screens.find((x) => x.key === current && x.device === "Desktop");
    const required: string[] = [];
    function walk(node: DesignNode) {
      if (/^(Input|Select|Textarea)\//.test(node.instanceRef || "") && node.name?.includes("*")) required.push(node.name);
      node.children?.forEach(walk);
    }
    if (screen) walk(screen.resolved);
    const missing = required.find((name) => !form[name]?.trim());
    if (missing) { inform(`Preencha ${missing.replace("*","").trim()}.`,"error"); return false; }
    return true;
  }
  async function act(target?: string, name = "") {
    if (busy) return;
    const lower = name.toLowerCase();
    if (offline && lower.includes("tentar novamente")) {
      if (navigator.onLine) setOffline(false);
      else inform("Sem conexão. Verifique a rede e tente novamente.","error");
      return;
    }
    if (lower.includes("recolher") || lower.includes("expandir") || lower === "toggle") { setSidebarCollapsed(!collapsed); return; }
    if (lower.startsWith("sair") || target === "login") {
      await fetch("/api/auth", {method:"DELETE"}); router.replace("/"); return;
    }
    if (target === "senha" || target === "senha-enviada") {
      inform("Procure o administrador da instituição para tratar seu acesso."); return;
    }
    if (lower.includes("limpar busca")) {
      setQuery(""); setFilter("todos");
      if (slug === "sem-resultados") router.push("/app/pacientes?filter=todos");
      return;
    }
    if (slug === "pacientes" && ["todos","internados","observação"].includes(lower)) {
      setFilter(lower === "observação" ? "observacao" : lower as "internados"|"todos"); return;
    }
    if (lower.includes("salvar rascunho")) {
      if (patientId) localStorage.setItem(draftKey(source,patientId),JSON.stringify(form));
      if (await saveRecord(clinicalTarget[source] || source, "draft")) navigate("rascunho-salvo");
      return;
    }
    if (target && Object.values(reviewSources).includes(slug) && target.startsWith("revis")) {
      if (slug === "checagem" && !form[PRESCRIPTION_ITEM]) {
        inform(prescriptions.length ? "Selecione o item da prescrição." : "Não há prescrição vigente para checar.","error"); return;
      }
      if (validRequired()) { localStorage.setItem(draftKey(source,patientId),JSON.stringify(form)); navigate(target); }
      return;
    }
    if (slug === "cadastro" && target === "revisao-cadastro") {
      if (validRequired()) { localStorage.setItem(draftKey(source,patientId),JSON.stringify(form)); navigate(target); }
      return;
    }
    if (slug === "revisao-cadastro" && lower.includes("confirmar")) {
      if (reviewReady && validRequired("cadastro")) await createPatient();
      return;
    }
    if (reviewSources[slug] && (lower.includes("confirmar") || lower.includes("finalizar"))) {
      if (!reviewReady) return;
      if (!validRequired(source)) return;
      if (!Object.values(form).some((value)=>value.trim())) { inform("Nenhum dado para confirmar. Volte e preencha o formulário.","error"); return; }
      const returnTo = slug === "revisao-sinais" ? "sinais" : slug === "revisao-checagem" ? "prescricao" : slug === "revisao-saida" ? "historico" : "resumo";
      if (await saveRecord(clinicalTarget[slug] || source)) navigate(returnTo);
      return;
    }
    // "Registrar sinais", "Registrar em nova anotação" etc. apenas abrem o formulário correspondente.
    if (target && formScreens.has(target)) { navigate(target); return; }
    if (lower.startsWith("salvar") || lower.startsWith("registrar")) {
      if (validRequired() && await saveRecord(clinicalTarget[slug] || slug)) { inform("Registro salvo.","success"); router.refresh(); }
      return;
    }
    if (target) navigate(target);
  }
  const visiblePatients = slug === "sem-resultados" ? [] : patients.filter((p) => {
    const matches = `${p.name} ${p.chart} ${p.document}`.toLowerCase().includes(query.toLowerCase());
    const status = filter === "internados" ? p.status.startsWith("Internad") : filter === "observacao" ? p.status === "Em observação" : true;
    return matches && status;
  });
  function dynamicText(text: string) {
    if (text === "Ana Souza") return user.name;
    if (text === "Ana Souza • Técnica de enfermagem") return `${user.name} • ${roleName[user.role]}`;
    if (text === "Hospital escola / Enfermaria A") return `Hospital escola / ${patient?.ward || "Plantão"}`;
    if (text === "Téc. de enfermagem" || text === "Técnica de enfermagem") return roleName[user.role];
    if (slug === "perfil" && text === "ana@hospital.edu.br") return user.email || "";
    if (slug === "perfil" && text === "Registro de demonstração") return "Não informado";
    if (slug === "perfil" && text === "Enfermaria A") return patient?.ward || "Não informado";
    if (text === "Téc. de enfermagem") return roleName[user.role];
    if (text === "Salvo às 10:16") return "Salvo neste dispositivo";
    if (patient && ["resumo","admissao"].includes(slug)) {
      if (text === "27/09/2026 • 07:30") return recordDateTime(latestRecord("admissao"));
      if (text === "Registrada na admissão") {
        const admission = latestRecord("admissao")?.data;
        return admission?.["Motivo da internação"] || admission?.["Queixa principal"] || "Não registrada";
      }
    }
    if (patient && slug === "resumo") {
      if (text === "Anotação • 09:20") return latestRecord("enfermagem") ? `Anotação • ${recordDateTime(latestRecord("enfermagem"))}` : "Nenhum registro";
      if (text === "09:20") return latestRecord("enfermagem") ? recordDateTime(latestRecord("enfermagem")) : "—";
    }
    if (patient && slug === "triagem" && text === "27/09/2026 • 07:40") return recordDateTime(latestRecord("triagem"));
    if (["nova-anotacao","revisar-anotacao","registrar-sinais","revisao-sinais","checagem","revisao-checagem","saida","revisao-saida"].includes(slug)) {
      if (text === "27/09/2026 • 10:15") return currentDateTime;
      if (text === "27/09/2026") return currentDate;
    }
    if (text === "Hospital escola • Enfermaria A • 27/09/2026") return `Hospital escola • ${patient?.ward || "Plantão"} • ${currentDate}`;
    if (slug === "inicio") {
      if (text === "24") return String(stats.admitted).padStart(2,"0");
      if (text === "06") return String(stats.drafts).padStart(2,"0");
      if (text === "03") return String(stats.surgeries).padStart(2,"0");
    }
    if (slug === "pacientes" && text.includes("Exibindo 3 de 24 pacientes"))
      return `Exibindo ${visiblePatients.length} de ${patients.length} pacientes`;
    if (!patient) return text;
    if (slug === "resumo") {
      if (text === "27/09/2026 • 07:30" || text === "Registrada na admissão") return "Não registrado";
      if (text === "Anotação • 09:20") {
        const latest = records.find((record)=>record.status === "confirmed");
        return latest ? `${latest.type} • ${new Date(latest.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"})}` : "Nenhum registro";
      }
    }
    if (text === "Internada" || text === "Internado") return patient.status;
    const today = new Date();
    const [year,month,day] = patient.birth.split("-").map(Number);
    const age = today.getFullYear()-year-(today.getMonth()+1<month || (today.getMonth()+1===month && today.getDate()<day) ? 1 : 0);
    return text
      .replaceAll("Maria Oliveira",patient.name).replaceAll("PS-00124",patient.chart)
      .replaceAll("14/05/1982",dateBR(patient.birth)).replaceAll("Feminino",patient.sex)
      .replaceAll("44 anos",`${age} anos`)
      .replaceAll("Enfermaria A",patient.ward || "Sem unidade")
      .replaceAll("Leito 12",patient.bed ? `Leito ${patient.bed}` : "Sem leito")
      .replaceAll("INT-0042",patient.admission || "Sem internação")
      .replaceAll("DIPIRONA",patient.allergies.toUpperCase() || "NÃO REGISTRADA")
      .replaceAll("RISCO DE QUEDA: registrado",patient.risks.toUpperCase())
      .replaceAll("Ana Souza",user.name)
      .replaceAll("Técnica de enfermagem",roleName[user.role]);
  }
  function vital(label: string) {
    const latest = records.find((record)=>record.type==="sinais" && record.status==="confirmed");
    const data = latest?.data || {};
    const values: Record<string,string> = {
      PA:data["PA sistólica • mmHg"] && data["PA diastólica • mmHg"] ? `${data["PA sistólica • mmHg"]}/${data["PA diastólica • mmHg"]}` : "",
      FC:data["FC • bpm"],FR:data["FR • irpm"],"SpO₂":data["SpO₂ • %"],
      Temperatura:data["Temperatura • °C"],Dor:data["Dor • 0 a 10"],
    };
    const units: Record<string,string> = {PA:"mmHg",FC:"bpm",FR:"irpm","SpO₂":"%",Temperatura:"°C",Dor:"0 a 10"};
    const value = values[label];
    const time = latest ? new Date(latest.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}) : "";
    return {value:value || "Não registrado",unit:value ? `${units[label] || ""}${time ? ` • ${time}` : ""}` : "Sem aferição confirmada"};
  }
  let patientRowIndex = 0;
  const rowTarget = openSection && patientSections.has(openSection) ? openSection : "resumo";
  function patientRow(row: Patient, key: string) {
    return <div className="patient-row patient-row-actions" key={key}>
      <button type="button" className="patient-row-main" onClick={()=>navigate(rowTarget,row.id)}
        aria-label={`Abrir ${sectionNames[rowTarget] || "prontuário"} de ${row.name}`}>
        <span><strong>{row.name}</strong><small>{row.chart} • {row.ward || "Sem unidade"} • {row.bed ? `Leito ${row.bed}` : "Sem leito"}</small></span>
        <span className="patient-row-status">{row.status} →</span></button>
      <span className="patient-shortcuts" role="group" aria-label={`Atalhos de ${row.name}`}>
        {patientShortcuts.map(([target,label])=><button type="button" key={target} className="btn btn-secondary patient-shortcut"
          onClick={()=>navigate(target,row.id)} aria-label={`${label} de ${row.name}`}>{label}</button>)}
      </span>
    </div>;
  }
  async function upload(file: File) {
    if (!patientId) { inform("Selecione um paciente.","error"); return; }
    const data = new FormData(); data.append("file",file);data.append("patient",patientId);
    data.append("category",form.Categoria || "Outros");
    setBusy(true);
    const response = await fetch("/api/files",{method:"POST",body:data}).catch(()=>null);
    setBusy(false);
    const result = response ? await response.json().catch(() => ({error:"Erro interno do servidor"})) : {error:"Sem conexão."};
    if (!response?.ok) { inform(result.error || "Erro no envio.","error"); return; }
    inform("Arquivo anexado.","success");router.refresh();
  }
  function navActive(target?: string) {
    return target === slug || (target === "inicio" && slug === "setembro") ||
      (target === "enfermagem" && ["nova-anotacao","revisar-anotacao"].includes(slug)) ||
      (target === "resumo" && patientSections.has(slug) && !["triagem","enfermagem","nova-anotacao","revisar-anotacao"].includes(slug));
  }
  function render(node: DesignNode, key: string, parentAxis: "H" | "V" = "V"): ReactNode {
    if (slug === "enfermagem" && node.target === "nova-anotacao" &&
      (node.over?.Label || node.name) === "Retomar rascunho" && !hasNoteDraft) return null;
    if (slug === "checagem" && node.name === "Seção / Item da prescrição") {
      const selectedItem = form[PRESCRIPTION_ITEM] || "";
      return <section key={key} className="record-panel entry-panel" aria-label="Item da prescrição">
        <label className="design-label" htmlFor="prescription-item"><span>{PRESCRIPTION_ITEM}</span>
          <select id="prescription-item" className="design-control" value={selectedItem} disabled={!prescriptions.length || !canWrite(user.role,"checagem")}
            onChange={(event)=>{ const value = event.target.value; setForm((old)=>({...old,[PRESCRIPTION_ITEM]:value})); }}>
            <option value="">{prescriptions.length ? "Selecione o item" : "Nenhuma prescrição vigente"}</option>
            {prescriptions.map((item)=>{ const label = prescriptionLabel(item); return <option key={item.id} value={label}>{label}</option>; })}
          </select></label>
        {!prescriptions.length && <p className="muted">Não há prescrição confirmada para este paciente. A checagem depende de um item prescrito.</p>}
      </section>;
    }
    if (sampleOnlyScreens.has(slug) && (node.name?.startsWith("Seção /") || node.name === "Tabela" || node.instanceRef?.startsWith("Table") ||
      (node.instanceRef?.startsWith("Attachment") && slug !== "alergias"))) return null;
    if (reviewSources[slug] && node.name?.startsWith("Seção /")) return null;
    if (node.instanceRef === "Vital") {
      const labelNode = node.children?.[0]?.children?.find((child)=>child.name === "Label");
      const label = labelNode?.text || "Sinal vital";
      const entry = vital(label);
      return <article key={key} className="vital-card"><div className="vital-label"><Lucide.Activity size={18} strokeWidth={1.75}/>{label}</div>
        <strong>{entry.value}</strong><small>{entry.unit}</small></article>;
    }
    if (node.kind === "text" && ["Rascunho","Salvo às 10:16"].includes(node.text || "") && !Object.values(form).some(Boolean)) return null;
    if (node.instanceRef === "Alert/Allergy" && !patient?.allergies) return null;
    if (node.instanceRef === "Alert/Warning" && node.target === "alergias" && !patient?.risks) return null;
    if (node.instanceRef?.startsWith("PatientRow") && ["pacientes","inicio","sem-resultados"].includes(slug)) {
      const row = visiblePatients[patientRowIndex++];
      return row ? patientRow(row,key) : null;
    }
    if (node.instanceRef?.startsWith("NoteItem") && ["enfermagem","historico","revisar-anotacao"].includes(slug)) return null;
    if (node.instanceRef?.startsWith("HistoryItem") && ["historico","resumo","sinais"].includes(slug)) return null;
    if ((node.name === "Tabela" || node.instanceRef?.startsWith("Table")) && slug === "cirurgias") return null;
    // Atalho de exemplo do design aponta para paciente fixo; a lista real fica em surgeryPanel.
    if (slug === "cirurgias" && node.target === "cirurgia") return null;
    if (node.instanceRef?.startsWith("Attachment") && ["documentos","cirurgia"].includes(slug)) return null;
    if (node.kind === "text" && node.text === "Proz Saúde")
      return <span key={key} className="brand-slot" style={{flex:node.w === "fill" && parentAxis === "H" ? "1 1 0" : undefined}}>
        <Brand height={node.size === 20 ? 32 : node.size && node.size >= 23 ? 55 : 32}/></span>;
    const shownText = node.kind === "text" ? cleanDemo(dynamicText(node.text || "")) : "";
    if (node.kind === "text" && shownText === null) return null;
    if (node.kind === "text") return <p key={key} className="design-text" style={{
      color:colors[node.color || "text"] || node.color, fontSize:node.size || 14,
      fontWeight:node.bold ? 700 : 400, lineHeight:1.5,
      textAlign:node.alignText === "CENTER" ? "center" : "left",
      flex:node.w === "fill" && parentAxis === "H" ? "1 1 0" : undefined,
      width:node.w === "fill" && parentAxis === "V" ? "100%" : undefined,
    }}>{shownText}</p>;
    if (node.kind === "icon") {
      const Icon = (Lucide as unknown as Record<string, React.ComponentType<{size?:number;strokeWidth?:number;color?:string}>>)[node.icon || ""];
      return Icon ? <Icon key={key} size={typeof node.w === "number" ? node.w : 21} strokeWidth={1.75} color={colors[node.color || "brand"] || node.color}/> : null;
    }
    const ref = node.instanceRef || "";
    if (/^(Input|Search|Select|Textarea)\//.test(ref)) {
      const label = node.over?.Label || node.name || "Campo";
      const inEntry = entryWritable && !!entry?.fields.some((field)=>field.label === label);
      const readOnly = ref.includes("ReadOnly") && !inEntry;
      const storedValue = records.find((record)=>record.type===slug && record.status==="confirmed")?.data[label];
      const linkedValue = label === "Alergias" ? patient?.allergies : label === "Risco de queda" ? patient?.risks : "";
      const placeholder = inEntry ? "" : readOnly && !storedValue && !linkedValue ? "Não registrado" : cleanDemo(node.over?.["Control/Value"] || "") ?? "";
      const value = ref.startsWith("Search/") ? query : inEntry ? entryValue(label) : readOnly ? (storedValue || linkedValue || "") :
        slug === "configuracoes" && label === "Tamanho do texto" ? (form[label] || "Padrão") : (form[label] || "");
      const update = (value: string) => {
        if (ref.startsWith("Search/")) { setQuery(value); return; }
        setForm((old) => ({...old,[label]:value}));
        if (slug === "configuracoes" && label === "Tamanho do texto") {
          localStorage.setItem(`proz:text-size:${user.id}`,value);
          document.body.style.zoom = value === "Muito grande" ? "1.2" : value === "Grande" ? "1.1" : "1";
        }
      };
      const editable = !patientSections.has(slug) || canWrite(user.role, clinicalTarget[slug] || slug);
      const common = { id:`field-${key}`, value, onChange:(event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>update(event.target.value),
        required:label.includes("*"), disabled:ref.includes("Disabled") || readOnly || (!editable && !ref.startsWith("Search/")) };
      return <label key={key} className="design-label" htmlFor={common.id} style={{width:node.w === "fill" ? "100%" : typeof node._w === "number" ? node._w : undefined}}>
        <span>{label}</span>
        {ref.startsWith("Textarea/") ? <textarea {...common} className="design-control design-textarea" placeholder={placeholder}/> :
          ref.startsWith("Select/") ? <select {...common} className="design-control">{!(slug === "configuracoes" && label === "Tamanho do texto") && <option value="">{placeholder || "Selecione"}</option>}{(selectors[label] || ["Sim","Não","Outro"]).map((option)=><option key={option}>{option}</option>)}</select> :
          <input {...common} type={ref.startsWith("Search/") ? "search" : label.toLowerCase().includes("senha") ? "password" : "text"} className="design-control" placeholder={placeholder}/>}
      </label>;
    }
    if (/^(Checkbox|Radio)\//.test(ref)) {
      if (slug === "configuracoes" && ref.startsWith("Checkbox/")) return null;
      const label = node.over?.Label || node.name || "Opção";
      const radio = ref.startsWith("Radio");
      return <label key={key} style={{display:"flex",alignItems:"center",gap:8,minHeight:44}}>
        <input type={radio ? "radio" : "checkbox"} name={radio ? "choice" : label}
          disabled={patientSections.has(slug) && !canWrite(user.role,clinicalTarget[slug] || slug)}
          checked={radio ? form["Situação *"] === label : form[label] === "Sim"}
          onChange={(event)=>{
            setForm((old)=>radio ? {...old,["Situação *"]:label} : {...old,[label]:event.target.checked ? "Sim" : ""});
          }}/>{label}
      </label>;
    }
    if (ref.startsWith("Uploader")) return <label key={key} className="design-label">Anexar arquivo
      <input type="file" className="design-control" disabled={!canWrite(user.role,"documentos")} accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event)=>{ const file=event.target.files?.[0]; if(file) void upload(file); }}/></label>;
    const isSidebar = node.name === "Sidebar";
    if (isSidebar && collapsed && !mobile) {
      // Menu compacto (tablet em pé): mesmos destinos do menu completo, com ícone e nome visíveis para toque.
      const items: DesignNode[] = [];
      (function collect(item: DesignNode) {
        if (item.target && item.target !== "@toggle") { if (!sidebarHidden.has(item.target)) items.push(item); return; }
        item.children?.forEach(collect);
      })(node);
      return <aside key={key} className="sidebar-collapsed" aria-label="Menu principal">
        <button className="collapsed-link collapsed-toggle" onClick={()=>setSidebarCollapsed(false)} aria-label="Expandir menu">
          <Lucide.PanelLeftOpen size={22} strokeWidth={1.75}/><span>Menu</span></button>
        {items.map((item)=>{
          const designIcon = item.children?.find((child)=>child.kind === "icon")?.icon || "Circle";
          const iconName = item.target === "saida" ? "ArrowRight" : designIcon;
          const Icon = (Lucide as unknown as Record<string, React.ComponentType<{size?:number;strokeWidth?:number}>>)[iconName] || Lucide.Circle;
          const label = item.target === "perfil" ? "Perfil" : item.target === "saida" ? "Saídas" : findText(item) || item.target || "";
          const active = navActive(item.target);
          return <button key={item.target} className="collapsed-link" aria-label={item.target === "saida" ? "Saídas hospitalares" : label} aria-current={active ? "page" : undefined}
            data-active={active} onClick={()=>navigate(item.target!)} style={item.target === "perfil" ? {marginTop:"auto"} : undefined}>
            <Icon size={22} strokeWidth={1.75}/><span>{label}</span></button>;
        })}
        <button className="collapsed-link" onClick={()=>void act("login","Sair")} aria-label="Sair da conta">
          <Lucide.LogOut size={22} strokeWidth={1.75}/><span>Sair</span></button>
      </aside>;
    }
    // A logo oficial substitui o ícone provisório que acompanhava a marca textual.
    let kids = node.children?.some((child)=>child.text === "Proz Saúde")
      ? node.children.filter((child)=>!(child.kind === "icon" && child.icon === "Hospital")) : node.children;
    if (isSidebar) kids = kids?.filter((child)=>!sidebarHidden.has(child.target || ""));
    if (node.name === "Grade" && slug === "inicio") {
      const model = JSON.stringify(node).includes('"target":"enfermagem"') ? findTarget(node,"enfermagem") : undefined;
      if (model && !findTarget(node,"triagem")) {
        const triage = relabel(model,"triagem","Triagem");
        kids = [...(kids || []), mobile ? triage : {...node.children![0], children:[triage]}];
      }
    }
    if (node.target === "saida") kids = kids?.map((child)=>child.kind === "icon" && child.icon === "LogOut" ? {...child,icon:"ArrowRight"} : child);
    const pad = node.pad || [0,0,0,0];
    const isRoot = key === "root";
    const isScrollArea = node.name?.includes("Área de rolagem");
    const isMainArea = node.name === "Área principal";
    const isBottomNav = node.name === "BottomNavigation";
    const isButton = !!node.target || ref.startsWith("Button/");
    const isTab = ref.startsWith("Tab/");
    const tabLabel = (node.over?.Label || node.name || "").toLowerCase();
    const selectedTab = isTab && (slug === "pacientes" && tabLabel === "internados" ? filter === "internados"
      : slug === "pacientes" && tabLabel === "todos" ? filter === "todos"
      : node.target === slug);
    const style: CSSProperties = {
      display:"flex", flexDirection:node.axis === "H" ? "row" : "column",
      alignItems:node.align === "CENTER" ? "center" : node.align === "MAX" ? "flex-end" : "flex-start",
      justifyContent:node.justify === "CENTER" ? "center" : node.justify === "MAX" ? "flex-end" : "flex-start",
      gap:node.gap || 0, padding:`${pad[0]||0}px ${pad[1]||0}px ${pad[2]||0}px ${pad[3]||0}px`,
      background:colors[node.bg || ""] || node.bg || undefined,
      border:node.border ? `1px solid ${colors[node.border] || node.border}` : undefined,
      borderRadius:node.radius || undefined,
      width:isRoot ? "100%" : node.w === "fill" ? (parentAxis === "V" ? "100%" : undefined) : typeof node.w === "number" && !isButton ? node.w : undefined,
      maxWidth:"100%",
      height:isRoot ? "100dvh" : isMainArea || isSidebar ? "100%" : undefined,
      minHeight:isRoot || isMainArea || isScrollArea ? 0 : typeof node.h === "number" ? (isButton ? 44 : node.h) : undefined,
      flex:node.w === "fill" && parentAxis === "H" ? "1 1 0" : node.h === "fill" && parentAxis === "V" ? "1 1 0" : undefined,
      overflowY:isScrollArea ? "auto" : undefined,
      overflowX:isScrollArea ? "hidden" : undefined,
      minWidth:isButton && typeof node.w === "number" ? Math.min(node.w, 320) : 0,
    };
    // Linhas formadas só por botões quebram para a linha seguinte em vez de espremer o texto.
    if (node.axis === "H" && (kids?.length || 0) > 1 && kids!.every((child)=>child.target || child.instanceRef?.startsWith("Button/")))
      style.flexWrap = "wrap";
    if (isRoot) style.overflow="hidden";
    if (isSidebar && !mobile) style.background = "var(--sidebar)";
    if (isBottomNav) { style.flexShrink=0; style.zIndex=10; }
    if (node.name === "Navegação do prontuário") { style.flexWrap="wrap"; style.flexShrink=0; }
    if (ref.startsWith("Button/Primary")) {
      style.background = "var(--yellow)";
      style.border = "0";
    } else if (ref.startsWith("Button/Secondary")) {
      style.background = "transparent";
      style.border = "1px solid var(--border)";
    } else if (isTab) {
      style.background = "transparent";
      style.border = selectedTab ? "0" : "1px solid var(--border)";
    } else if (isButton && ["brand","brand-dark","brand-soft"].includes(node.bg || "")) {
      style.background = "var(--yellow)";
    } else if (isButton && node.bg === "white") {
      style.background = "transparent";
      style.border = "1px solid var(--border)";
    }
    if (isButton) {
      if (node.name === "Toggle") {
        style.background = "var(--brand-dark)";
        style.color = "var(--white)";
      }
      const action = (node.over?.Label || node.name || "").toLowerCase();
      const isWriteAction = /^(salvar|registrar|revisar|confirmar|finalizar|anexar|nova anotação)/.test(action);
      const isActive = isTab ? selectedTab : navActive(node.target);
      return <button key={key} type="button" className="design-frame design-action" style={style} onClick={()=>act(node.target,node.over?.Label || node.name)}
        disabled={busy || (!!reviewSources[slug] && isWriteAction && !reviewReady) || (isWriteAction && patientSections.has(slug) && !canWrite(user.role,
          node.target && formScreens.has(node.target) ? clinicalTarget[node.target] || node.target : clinicalTarget[slug] || slug))}
        aria-label={node.name} aria-current={isActive ? "page" : undefined} data-active={isActive}
        data-variant={ref.startsWith("Button/Primary") ? "primary" : ref.startsWith("Button/Secondary") || node.bg === "white" ? "secondary" : isTab ? "tab" : ["brand","brand-dark","brand-soft"].includes(node.bg || "") ? "accent" : undefined}>
        {kids?.map((child,i)=>render(child,`${key}-${i}`,node.axis))}</button>;
    }
    return <div key={key} className={`design-frame ${isSidebar ? "sidebar-current" : ""} ${isBottomNav ? "bottom-nav" : ""} ${isScrollArea ? "scroll-area" : ""} ${isRoot ? "app-frame" : ""}`} style={style}>
      {isScrollArea && rowTarget !== "resumo" && ["pacientes","sem-resultados"].includes(slug) &&
        <div className="pick-banner" role="status"><span>Escolha o paciente para abrir {sectionNames[rowTarget] || rowTarget}.</span>
          <button type="button" className="btn btn-secondary" onClick={()=>router.push("/app/pacientes")}>Cancelar</button></div>}
      {isScrollArea && slug === "setembro" ? <SetembroAmarelo hero={setembroHero} onContinue={()=>navigate("inicio", "")}/> : kids?.map((child,i)=>render(child,`${key}-${i}`,node.axis))}
      {isSidebar && !mobile && <button type="button" className="design-action sidebar-logout" onClick={()=>void act("login","Sair")}>
        <Lucide.LogOut size={21} strokeWidth={1.75}/><span>Sair da conta</span></button>}
      {node.name?.includes("Área de rolagem") && reviews}
      {node.name?.includes("Área de rolagem") && entryPanel}
      {node.name?.includes("Área de rolagem") && recordsPanel}
      {node.name?.includes("Área de rolagem") && surgeryPanel}
      {isScrollArea && slug === "pacientes" && (visiblePatients.length>patientRowIndex || !visiblePatients.length) &&
        <section className="extra-results" aria-label="Resultados da busca"><div className="result-list">
          {visiblePatients.length ? visiblePatients.slice(patientRowIndex).map((p)=>patientRow(p,p.id)) : <div className="record-panel">Nenhum paciente encontrado. <button className="btn btn-secondary" onClick={()=>setQuery("")}>Limpar busca</button></div>}
        </div></section>}
      {node.name?.includes("Área de rolagem") && slug === "triagem" && <div style={{padding:20}}>
        {canWrite(user.role,"triagem")
          ? <button className="btn btn-primary" disabled={busy} onClick={async()=>{if(await saveRecord("triagem")){inform("Triagem salva.","success");router.refresh();}}}>Salvar triagem</button>
          : <p className="muted">Seu perfil permite consultar esta área, mas não registrar.</p>}
      </div>}
    </div>;
  }
  const reviews = reviewSources[slug] ? <section className="review-data" aria-label="Conferência dos dados"><h2>Dados para conferência</h2>
    {!reviewReady ? <p role="status">Carregando dados para conferência...</p> : <>
      {Object.entries(form).map(([name,value])=><div key={name}><strong>{name.replace("*","")}</strong><span>{value}</span></div>)}
      {!Object.keys(form).length && <p>Nenhum dado preenchido. Volte para corrigir.</p>}
    </>}
  </section> : null;
  const designLabels = new Set<string>();
  (function collect(node: DesignNode) {
    if (/^(Input|Select|Textarea)\//.test(node.instanceRef || "")) designLabels.add(node.over?.Label || node.name || "");
    node.children?.forEach(collect);
  })(selected.resolved);
  const entryPanel = entry ? <section className="record-panel entry-panel" aria-label={entry.title}>
    <h2 style={{fontSize:20,margin:0}}>{entry.title}</h2>
    {entryWritable ? <>
      {entry.fields.filter((field)=>!designLabels.has(field.label)).map((field)=>{
        const id = `entry-${slug}-${entry.fields.indexOf(field)}`;
        const common = { id, value:entryValue(field.label), disabled:busy,
          onChange:(event: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>{
            const value = event.target.value; setForm((old)=>({...old,[field.label]:value}));
          } };
        return <label key={field.label} className="design-label" htmlFor={id}>
          <span>{field.label}{entry.required.includes(field.label) ? " *" : ""}</span>
          {field.kind === "textarea" ? <textarea {...common} className="design-control design-textarea" placeholder={field.hint}/> :
            field.kind === "select" ? <select {...common} className="design-control"><option value="">Selecione</option>
              {field.options?.map((option)=><option key={option}>{option}</option>)}</select> :
            <input {...common} type="text" className="design-control" placeholder={field.hint}/>}
        </label>;
      })}
      {slug === "resultado" && <p className="muted">Para anexar o laudo em PDF, use <button type="button" className="link-button" onClick={()=>navigate("documentos")}>Documentos</button>.</p>}
      <div><button type="button" className="btn btn-primary" disabled={busy} onClick={()=>void saveEntry()}>{busy ? "Salvando..." : entry.button}</button></div>
    </> : <p className="muted">Seu perfil permite consultar esta área, mas não registrar.</p>}
  </section> : null;
  const recordType = clinicalTarget[slug] || slug;
  const shownRecords = slug === "historico" || slug === "resumo" ? records.filter((r)=>r.status==="confirmed") :
    records.filter((r)=>(r.type===recordType || (slug==="procedimentos" && r.type==="enfermagem" && !!r.data["Procedimentos realizados"])) && r.status==="confirmed"
      && (slug !== "documentos" || !form.Categoria || form.Categoria === "Todos os documentos" || r.data.Categoria === form.Categoria));
  const recordsPanel = !["login","setembro","inicio","pacientes","cadastro","revisao-cadastro","mais","perfil","configuracoes","cirurgias","erro","vazio","offline","permissao","sessao","rascunho-salvo"].includes(slug)
    && !reviewSources[slug] ? <section className="record-panel" aria-label="Registros do paciente"><h2 style={{fontSize:20,margin:0}}>Registros atuais</h2>
      {slug === "identificacao" && patient && <div className="record-card">
        <p><b>Nome completo:</b> {patient.name}</p><p><b>Prontuário:</b> {patient.chart}</p>
        <p><b>Nascimento:</b> {dateBR(patient.birth)}</p><p><b>Sexo:</b> {patient.sex}</p>
        <p><b>Nome da mãe:</b> {patient.mother || "Não informado"}</p>
        <p><b>Nome do pai:</b> {patient.father || "Não informado"}</p>
        <p><b>Documento:</b> {patient.document || "Não informado"}</p>
        <p><b>Telefone:</b> {patient.phone || "Não informado"}</p>
        <p><b>Endereço:</b> {[patient.address,patient.city].filter(Boolean).join(" • ") || "Não informado"}</p>
      </div>}
      {slug === "admissao" && patient && <div className="record-card">
        <p><b>Internação:</b> {patient.admission || "Não registrada"}</p>
        <p><b>Setor:</b> {patient.ward || "Não informado"}</p>
        <p><b>Leito:</b> {patient.bed || "Não informado"}</p>
        <p><b>Situação:</b> {patient.status}</p>
      </div>}
      {slug === "alergias" && <div className="record-card"><p><b>Alergias:</b> {patient?.allergies || "Não informado"}</p>
        <p><b>Riscos:</b> {patient?.risks || "Não informado"}</p></div>}
      {shownRecords.length ? shownRecords.map((record)=><article className="record-card" key={record.id}>
        <strong>{typeNames[record.type] || record.type} • {new Date(record.created_at).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</strong>
        <small className="muted">Registrado por {record.author_name}</small>
        {Object.entries(record.data).filter(([name,value])=>value&&name!=="ArquivoID"&&name!=="Tipo").map(([name,value])=><p key={name}><b>{name.replace("*","").trim()}:</b> {name==="Arquivo"&&record.data.ArquivoID
          ? <a href={`/api/files/${record.data.ArquivoID}`}>{value}</a> : value}</p>)}
        {slug === "prescricao" && record.type === "prescricao" && (()=>{
          const checks = records.filter((check)=>check.type==="checagem" && check.status==="confirmed" && check.data[PRESCRIPTION_ITEM]===prescriptionLabel(record));
          return <p className="muted">{checks.length
            ? `Checagens: ${checks.length} • última: ${checks[0].data["Situação *"] || "registrada"} em ${recordDateTime(checks[0])} por ${checks[0].author_name}`
            : "Nenhuma checagem registrada para este item."}</p>;
        })()}
        {slug === "exames" && record.type === "exames" && canWrite(user.role,"resultado") &&
          <button className="btn btn-secondary" style={{justifySelf:"start"}} onClick={()=>{
            try {
              const key = draftKey("resultado",patientId);
              localStorage.setItem(key,JSON.stringify({...JSON.parse(localStorage.getItem(key) || "{}"),Exame:record.data["Exame solicitado"] || ""}));
            } catch {}
            navigate("resultado");
          }}>Registrar resultado</button>}
      </article>) : !["identificacao","admissao","alergias"].includes(slug) && <p className="muted">Nenhum registro confirmado nesta área.</p>}
    </section> : null;
  const filteredSurgeries = surgeries.filter((entry)=>{
    const situation = form.Situação;
    const date = form.Data;
    return (!situation || situation === "Todas" || entry.data.Situação === situation)
      && (!date || entry.data.Data?.includes(date));
  });
  const surgeryPanel = slug === "cirurgias" ? <section className="record-panel" aria-label="Cirurgias programadas">
    <h2 style={{fontSize:20,margin:0}}>Cirurgias programadas</h2>
    {filteredSurgeries.length ? filteredSurgeries.map((entry)=><button key={entry.id} className="patient-row"
      onClick={()=>navigate("cirurgia",entry.patient.id)}>
      <span><strong>{entry.patient.name} • {entry.patient.chart}</strong>
        <small>{[entry.data.Procedimento,entry.data.Data,entry.data.Horário,entry.data.Sala,entry.data.Equipe].filter(Boolean).join(" • ")}</small></span>
      <span>{entry.data.Situação} →</span>
    </button>) : <p className="muted">Nenhuma cirurgia encontrada para os filtros.</p>}
  </section> : null;
  return <main className="scene" aria-busy={busy}>
    {render(selected.resolved,"root")}
    {notice && <div className="toast" data-kind={notice.kind} role={notice.kind === "error" ? "alert" : "status"}>{notice.message}</div>}
  </main>;
}
