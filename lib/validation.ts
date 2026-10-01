export const clinicalTypes = new Set([
  "triagem", "sinais", "anamnese", "exame-fisico", "exames", "resultado",
  "prescricao", "checagem", "enfermagem", "procedimentos", "cirurgia",
  "documentos", "saida", "alergias", "admissao",
]);
export function safeText(value: unknown, limit = 2000) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}
export function validEmail(value: unknown) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}
