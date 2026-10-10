import { HOD_DEPARTMENT_ID, type MasterData, type Role } from "@/lib/iams-data";
import type { SchemeVersion } from "@/types/scheme";

/** Field-keyed errors. Keys: "name", "programId", "components", "weightage", "c.<index>.<field>". */
export type SchemeErrors = Record<string, string>;

export const canManageSchemes = (role: Role) => role === "ADMIN" || role === "HOD";
export const inSchemeScope = (role: Role, departmentId: string) => role === "ADMIN" || (role === "HOD" && departmentId === HOD_DEPARTMENT_ID);

export function nextSchemeCode(list: SchemeVersion[]) {
  const max = list.reduce((m, s) => Math.max(m, parseInt(s.code.replace("SCH", ""), 10) || 0), 0);
  return `SCH${String(max + 1).padStart(3, "0")}`;
}

export const activeWeightage = (s: SchemeVersion) => s.components.filter((c) => c.active).reduce((t, c) => t + (Number(c.weightage) || 0), 0);

export function validateScheme(s: SchemeVersion, data: MasterData): SchemeErrors {
  const e: SchemeErrors = {};
  if (!s.name.trim()) e["name"] = "Enter a scheme name.";
  const prog = data.program.find((p) => p.id === s.programId);
  if (!s.departmentId) e["departmentId"] = "Select a department.";
  if (!prog) e["programId"] = "Select a program.";
  else if (prog.departmentId !== s.departmentId) e["programId"] = "This program does not belong to the selected department.";

  const codes = new Map<string, number>(); const names = new Map<string, number>(); const seqs = new Map<number, number>();
  s.components.forEach((c, i) => {
    const k = (f: string) => `c.${i}.${f}`;
    if (!c.name.trim()) e[k("name")] = "Required.";
    if (!c.code.trim()) e[k("code")] = "Required.";
    const code = c.code.trim().toUpperCase(); const name = c.name.trim().toLowerCase();
    if (code && codes.has(code)) e[k("code")] = "Duplicate code."; else if (code) codes.set(code, i);
    if (name && names.has(name)) e[k("name")] = "Duplicate name."; else if (name) names.set(name, i);
    if (!Number.isFinite(c.maxMarks) || c.maxMarks <= 0) e[k("maxMarks")] = "Must be more than 0.";
    if (c.passMarks !== undefined && (!Number.isFinite(c.passMarks) || c.passMarks < 0 || c.passMarks > c.maxMarks)) e[k("passMarks")] = "Must be between 0 and max marks.";
    if (!Number.isFinite(c.weightage) || c.weightage < 0 || c.weightage > 100) e[k("weightage")] = "Must be 0–100.";
    if (!Number.isInteger(c.sequence) || c.sequence < 1) e[k("sequence")] = "Whole number from 1.";
    else if (seqs.has(c.sequence)) e[k("sequence")] = "Order already used."; else seqs.set(c.sequence, i);
    if (s.type === "THEORY" && c.type !== "THEORY") e[k("type")] = "Theory scheme allows theory only.";
    if (s.type === "PRACTICAL" && c.type !== "PRACTICAL") e[k("type")] = "Practical scheme allows practical only.";
  });

  const active = s.components.filter((c) => c.active);
  if (active.length === 0) e["components"] = "Add at least one active component.";
  else if (s.type === "MIXED" && !(active.some((c) => c.type === "THEORY") && active.some((c) => c.type === "PRACTICAL")))
    e["components"] = "A mixed scheme needs at least one active theory and one active practical component.";
  if (s.weightageRule === "TOTAL_100" && active.length > 0 && activeWeightage(s) !== 100)
    e["weightage"] = `Active component weightage must total 100% (currently ${activeWeightage(s)}%).`;
  return e;
}

/** Permission + scope check shared by every scheme mutation. */
export function checkSchemeAccess(role: Role, s: Pick<SchemeVersion, "departmentId">): string | null {
  if (!canManageSchemes(role)) return "You cannot manage schemes.";
  if (!inSchemeScope(role, s.departmentId)) return "This scheme is outside your department.";
  return null;
}
