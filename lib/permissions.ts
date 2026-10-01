import type { Role } from "@/lib/db";

export function canWrite(role: Role, type: string) {
  if (role === "admin") return false; // administrador gerencia apenas contas
  const allowed: Record<Exclude<Role,"admin">,Set<string>> = {
    enfermeiro:new Set(["triagem","sinais","checagem","enfermagem","procedimentos","documentos","admissao","saida","alergias"]),
    tecnico:new Set(["sinais","checagem","enfermagem","procedimentos","documentos"]),
    medico:new Set(["anamnese","exame-fisico","exames","resultado","prescricao","procedimentos","cirurgia","documentos","admissao","saida","alergias"]),
  };
  return allowed[role].has(type);
}
