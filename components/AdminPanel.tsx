"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
import { PasswordInput } from "@/components/PasswordInput";

type ListedUser = { id:string; email:string; name:string; role:string; active:number; created_at:string; records:number };
type Draft = { name:string; email:string; role:string; password:string };
const roleNames: Record<string,string> = { medico:"Médico(a)", enfermeiro:"Enfermeiro(a)", tecnico:"Técnico(a) de enfermagem" };
const emptyDraft: Draft = { name:"", email:"", role:"tecnico", password:"" };

export function AdminPanel({ user }: { user:{id:string;name:string;role:string} }) {
  const router = useRouter();
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<{kind:"error"|"success";text:string}|null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ListedUser|null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [confirmDelete, setConfirmDelete] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"todos"|"ativos"|"inativos">("todos");

  async function reload() {
    const response = await fetch("/api/users").catch(() => null);
    if (response?.status === 401) { router.push("/"); return; }
    if (response?.ok) setUsers(await response.json());
    else setNotice({kind:"error",text:"Não foi possível carregar os usuários."});
    setLoaded(true);
  }
  useEffect(() => { void reload(); }, []);

  async function send(method: "POST"|"PATCH"|"DELETE", body?: object, query = "") {
    setBusy(true); setNotice(null);
    const response = await fetch(`/api/users${query}`, {method, headers:{"Content-Type":"application/json"},
      ...(body ? {body:JSON.stringify(body)} : {})}).catch(() => null);
    setBusy(false);
    if (!response) { setNotice({kind:"error",text:"Sem conexão com o servidor."}); return false; }
    if (response.status === 401) { router.push("/"); return false; }
    if (!response.ok) { setNotice({kind:"error",text:(await response.json().catch(()=>({}))).error || "Não foi possível concluir."}); return false; }
    await reload();
    return true;
  }
  function startEdit(entry: ListedUser) {
    setEditing(entry); setConfirmDelete("");
    setDraft({ name:entry.name, email:entry.email, role:entry.role, password:"" });
    setNotice(null);
    document.getElementById("admin-form")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function cancelEdit() { setEditing(null); setDraft(emptyDraft); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing) {
      const ok = await send("PATCH", { id:editing.id, name:draft.name, email:draft.email, role:draft.role, ...(draft.password ? {password:draft.password} : {}) });
      if (ok) { setNotice({kind:"success",text:`Conta de ${draft.name} atualizada.`}); cancelEdit(); }
    } else if (await send("POST", draft)) {
      setNotice({kind:"success",text:`Conta de ${draft.name} criada. Informe a senha inicial ao profissional.`});
      setDraft(emptyDraft);
    }
  }
  async function toggle(entry: ListedUser) {
    if (await send("PATCH", { id:entry.id, active:!entry.active }))
      setNotice({kind:"success",text:`Conta de ${entry.name} ${entry.active ? "desativada" : "reativada"}.`});
  }
  async function remove(entry: ListedUser) {
    if (await send("DELETE", undefined, `?id=${encodeURIComponent(entry.id)}`)) {
      setNotice({kind:"success",text:`Conta de ${entry.name} excluída.`});
      if (editing?.id === entry.id) cancelEdit();
    }
    setConfirmDelete("");
  }
  async function logout() { await fetch("/api/auth",{method:"DELETE"}); router.replace("/"); }

  const visible = users.filter((entry) => `${entry.name} ${entry.email}`.toLowerCase().includes(query.trim().toLowerCase())
    && (status === "todos" || (status === "ativos" ? !!entry.active : !entry.active)));
  const field = (key: keyof Draft) => ({ value:draft[key], onChange:(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => {
    const value = event.target.value; setDraft((old) => ({...old,[key]:value}));
  } });

  return <main className="admin-shell">
    <header className="admin-header">
      <div className="admin-title"><Brand height={44}/>
        <div><h1>Contas de acesso</h1><p className="muted">{user.name} • conta administradora</p></div></div>
      <button className="btn btn-secondary" onClick={logout}>Sair</button>
    </header>
    {notice && <p className={notice.kind === "error" ? "admin-notice admin-notice-error" : "admin-notice admin-notice-success"}
      role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p>}
    <div className="admin-grid">
      <section className="admin-card" id="admin-form" aria-label={editing ? "Editar conta" : "Nova conta"}>
        <h2>{editing ? "Editar conta" : "Nova conta"}</h2>
        <form onSubmit={submit} className="admin-form">
          <label className="field">Nome completo<input name="name" required minLength={2} autoComplete="off" {...field("name")}/></label>
          <label className="field">E-mail institucional<input name="email" type="email" required autoComplete="off" {...field("email")}/></label>
          <label className="field">Perfil<select name="role" required {...field("role")}>
            <option value="medico">Médico(a)</option><option value="enfermeiro">Enfermeiro(a)</option>
            <option value="tecnico">Técnico(a) de enfermagem</option></select></label>
          <label className="field">{editing ? "Nova senha (opcional)" : "Senha inicial"}
            <PasswordInput name="password" minLength={8} required={!editing} autoComplete="new-password" {...field("password")}/>
            <small className="muted">{editing ? "Deixe em branco para manter a senha atual." : "Mínimo de 8 caracteres."}</small></label>
          <div className="admin-actions">
            <button className="btn btn-primary" disabled={busy}>{busy ? "Salvando..." : editing ? "Salvar alterações" : "Criar conta"}</button>
            {editing && <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancelar</button>}
          </div>
        </form>
      </section>
      <section className="admin-card" aria-label="Usuários cadastrados">
        <h2>Usuários <span className="muted">({users.length})</span></h2>
        <div className="admin-filters">
          <label className="field">Buscar<input type="search" placeholder="Nome ou e-mail" value={query} onChange={(event)=>setQuery(event.target.value)}/></label>
          <label className="field">Situação<select value={status} onChange={(event)=>setStatus(event.target.value as typeof status)}>
            <option value="todos">Todas</option><option value="ativos">Ativas</option><option value="inativos">Inativas</option></select></label>
        </div>
        {!loaded ? <p className="muted">Carregando...</p> : !visible.length ? <p className="muted">
          {users.length ? "Nenhuma conta encontrada para a busca." : "Nenhuma conta cadastrada. Crie a primeira conta ao lado."}</p> :
          <ul className="admin-list">{visible.map((entry) => <li key={entry.id} className="admin-user" data-editing={editing?.id === entry.id}>
            <div className="admin-user-info">
              <strong>{entry.name}</strong>
              <span className="muted">{entry.email}</span>
              <span className="admin-tags">
                <span className="admin-tag">{roleNames[entry.role] || entry.role}</span>
                <span className={entry.active ? "admin-tag admin-tag-active" : "admin-tag admin-tag-inactive"}>{entry.active ? "Ativa" : "Inativa"}</span>
                {entry.records > 0 && <span className="admin-tag">{entry.records} registro{entry.records > 1 ? "s" : ""} clínico{entry.records > 1 ? "s" : ""}</span>}
              </span>
            </div>
            {confirmDelete === entry.id ? <div className="admin-actions">
              <span className="admin-confirm">Excluir esta conta definitivamente?</span>
              <button className="btn btn-danger" disabled={busy} onClick={()=>remove(entry)}>Confirmar exclusão</button>
              <button className="btn btn-secondary" onClick={()=>setConfirmDelete("")}>Cancelar</button>
            </div> : <div className="admin-actions">
              <button className="btn btn-secondary" disabled={busy} onClick={()=>startEdit(entry)}>Editar</button>
              <button className="btn btn-secondary" disabled={busy} onClick={()=>toggle(entry)}>{entry.active ? "Desativar" : "Reativar"}</button>
              {entry.records > 0
                ? <span className="muted admin-hint">Com registros clínicos: apenas desativação.</span>
                : <button className="btn btn-secondary btn-danger-outline" disabled={busy} onClick={()=>setConfirmDelete(entry.id)}>Excluir</button>}
            </div>}
          </li>)}</ul>}
      </section>
    </div>
  </main>;
}
