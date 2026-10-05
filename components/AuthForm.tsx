"use client";
import { FormEvent, useState } from "react";
import { Brand } from "@/components/Brand";
import { PasswordInput } from "@/components/PasswordInput";
import { useRouter } from "next/navigation";

export function AuthForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }).catch(() => null);
    if (!response) { setBusy(false); setError("Sem conexão. Tente novamente."); return; }
    const result = await response.json().catch(() => ({ error: "Erro interno do servidor" }));
    if (!response.ok) { setBusy(false); setError(result.error || "Não foi possível continuar."); return; }
    router.replace(result.role === "admin" ? "/app/admin" : "/app/setembro");
  }
  return <main className="form-page"><form className="auth-card" onSubmit={submit}>
    <div className="brand"><Brand priority/></div>
    <div style={{height:1,background:"var(--border)"}}/>
    <h1>Entrar no sistema</h1>
    {!configured && <p className="error" role="alert">
      Conta administradora não configurada. Defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 8 caracteres) em .env.local e reinicie o servidor.
    </p>}
    <label className="field">E-mail institucional<input type="email" name="email" placeholder="nome@hospital.edu.br" required autoComplete="username"/></label>
    <label className="field">Senha<PasswordInput name="password" placeholder="Digite sua senha" required autoComplete="current-password"/></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="btn btn-yellow" disabled={busy}>{busy ? "Aguarde..." : "Entrar"}</button>
    <button type="button" className="btn btn-secondary" onClick={()=>setHelp(true)}>Esqueceu a senha?</button>
    {help && <p className="muted" role="status">Procure o administrador da instituição para tratar seu acesso.</p>}
  </form></main>;
}
