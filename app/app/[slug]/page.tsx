import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { SESSION_COOKIE, userFromToken } from "@/lib/auth";
import { type Patient } from "@/lib/db";
import { getScreens, isScreen } from "@/lib/design";
import { patientFrom, store, recordFrom } from "@/lib/json-db";
import { DesignScreen } from "@/components/DesignScreen";
import { AdminPanel } from "@/components/AdminPanel";
import { patientSections } from "@/lib/navigation";
import { setembroHero } from "@/lib/setembro";

export const runtime = "nodejs";
export default async function AppScreen({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ patient?: string; abrir?: string; filter?: string }>;
}) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const user = await userFromToken(token);
  if (!user && slug === "sessao") return <DesignScreen slug={slug} screens={getScreens(slug)}
    offlineScreens={getScreens("offline")} user={{id:"",name:"",role:"tecnico"}}
    patient={null} patients={[]} records={[]} stats={{admitted:0,drafts:0,surgeries:0}} surgeries={[]}
    now={new Date().toISOString()}/>;
  if (!user) redirect(token ? "/app/sessao" : "/");
  if (slug === "admin") {
    if (user.role !== "admin") redirect("/app/permissao");
    return <AdminPanel user={{ id:user.id, name: user.name, role: user.role }}/>;
  }
  // O administrador usa somente o painel de contas.
  if (user.role === "admin") redirect("/app/admin");
  if (!isScreen(slug)) notFound();
  const { patient: requested, abrir, filter } = await searchParams;
  const openSection = abrir && patientSections.has(abrir) ? abrir : undefined;
  if (!requested && patientSections.has(slug)) redirect("/app/pacientes");
  const database = await store();
  // Cada tela consulta apenas os dados que apresenta. A seleção do paciente
  // continua validada mesmo quando o módulo não precisa carregar seus registros.
  const [patientRows, selectedPatient, counts, surgeryRows] = await Promise.all([
    ["inicio", "pacientes", "sem-resultados"].includes(slug)
      ? database.patient.findMany({orderBy:{name:"asc"}}) : Promise.resolve([]),
    requested ? database.patient.findUnique({where:{id:requested}}) : Promise.resolve(null),
    slug === "inicio" ? Promise.all([
      database.patient.count({where:{status:{startsWith:"Internad"}}}),
      database.clinicalRecord.count({where:{status:"draft"}}),
      database.clinicalRecord.count({where:{type:"cirurgia",status:"confirmed"}}),
    ]) : Promise.resolve([0, 0, 0]),
    slug === "cirurgias" ? database.clinicalRecord.findMany({where:{type:"cirurgia",status:"confirmed"},
      include:{patient:true},orderBy:{createdAt:"asc"}}) : Promise.resolve([]),
  ]);
  const patients: Patient[] = patientRows.map(patientFrom)
    .sort((a: Patient,b: Patient)=>a.id==="pac-maria"?-1:b.id==="pac-maria"?1:a.name.localeCompare(b.name));
  if (requested && !selectedPatient) redirect("/app/pacientes");
  const patient = selectedPatient ? patientFrom(selectedPatient) : null;
  const records = patient && patientSections.has(slug)
    ? (await database.clinicalRecord.findMany({where:{patientId:patient.id},include:{author:{select:{name:true}}},orderBy:{createdAt:"desc"},take:100}))
      .map((row: any) => ({ ...recordFrom(row), author_name:row.author.name, data: JSON.parse(row.data) as Record<string,string> }))
    : [];
  const stats = {admitted:counts[0], drafts:counts[1], surgeries:counts[2]};
  const surgeries = surgeryRows.map((row: any)=>({id:row.id,patient:patientFrom(row.patient),data:JSON.parse(row.data) as Record<string,string>}));
  const reviewSource: Record<string,string> = {
    "revisao-cadastro":"cadastro", "revisar-anotacao":"nova-anotacao", "revisao-sinais":"registrar-sinais",
    "revisao-checagem":"checagem", "revisao-saida":"saida",
  };
  // Setembro Amarelo abre dentro do sistema, sobre a estrutura (menu e barra superior) da tela Início.
  const screens = slug === "setembro" ? getScreens("inicio")
    : [...getScreens(slug), ...(reviewSource[slug] ? getScreens(reviewSource[slug]) : [])];
  const sidebarCookie = cookieStore.get(`proz_sidebar_${user.id}`)?.value;
  const initialCollapsed = sidebarCookie === "1" ? true : sidebarCookie === "0" ? false : null;
  return <DesignScreen slug={slug} screens={screens} offlineScreens={getScreens("offline")}
    user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
    initialCollapsed={initialCollapsed}
    initialPatientFilter={filter === "todos" ? "todos" : "internados"}
    patient={patient} patients={patients} records={records} stats={stats} surgeries={surgeries} now={new Date().toISOString()} openSection={openSection} setembroHero={slug === "setembro" ? setembroHero() : ""}/>;
}
