/**
 * Pure business rules for Faculty, Class Incharge and Students.
 * Used by the pages (to show errors) AND by the store (so rules can't be bypassed).
 * Will move to the REST API later; keep these free of React.
 */
import { departmentOf, HOD_DEPARTMENT_ID, nextCode, type MasterData, type Role, type Row } from "@/lib/iams-data";
import type { Faculty, InchargeAssignment, Student } from "@/types/people";

export interface ValidatedRow<T> {
  line: number;
  raw: Record<string, string>;
  value?: T;
  errors: string[];
}

export const HOD_ASSIGNABLE_ROLES: Role[] = ["FACULTY", "CLASS_INCHARGE"];

export const sectionDepartment = (data: MasterData, sectionId: string) => {
  const s = data.section.find((x) => x.id === sectionId);
  return s ? departmentOf("section", s, data) : undefined;
};

/** Sections whose students the actor may see. */
export function visibleSectionIds(role: Role, data: MasterData, mySectionIds: string[]): string[] {
  if (role === "ADMIN") return data.section.map((s) => s.id);
  if (role === "HOD") return data.section.filter((s) => sectionDepartment(data, s.id) === HOD_DEPARTMENT_ID).map((s) => s.id);
  if (role === "CLASS_INCHARGE") return mySectionIds;
  return [];
}

/** Returns an error message or null. `prev` is the stored record when editing. */
export function checkFaculty(
  actor: Role, next: Faculty, prev: Faculty | undefined, ctx: { faculty: Faculty[]; incharge: InchargeAssignment[]; sectionIds: string[]; data: MasterData },
): string | null {
  if (actor !== "ADMIN" && actor !== "HOD") return "You are not allowed to manage faculty.";
  if (actor === "HOD") {
    if (next.departmentId !== HOD_DEPARTMENT_ID) return "You can only manage faculty in your own department.";
    if (prev && prev.departmentId !== HOD_DEPARTMENT_ID) return "You can only manage faculty in your own department.";
    if (!HOD_ASSIGNABLE_ROLES.includes(next.role)) return "Head of Department can only assign Faculty or Class Incharge.";
    if (prev && !HOD_ASSIGNABLE_ROLES.includes(prev.role)) return "You cannot edit this account.";
  }
  if (!next.name.trim()) return "Name is required.";
  if (!/^\S+@\S+\.\S+$/.test(next.email.trim())) return "Enter a valid email address.";
  if (!next.departmentId || !ctx.data.department.some((d) => d.id === next.departmentId)) return "Department is required.";
  const email = next.email.trim().toLowerCase();
  if (ctx.faculty.some((x) => x.id !== next.id && x.email.toLowerCase() === email)) return `${email} is already used by another faculty member.`;
  const emp = next.employeeCode?.trim().toUpperCase();
  if (emp && ctx.faculty.some((x) => x.id !== next.id && x.employeeCode?.toUpperCase() === emp)) return `Employee code ${emp} is already in use.`;
  const secs = ctx.sectionIds;
  if (next.role !== "CLASS_INCHARGE" && secs.length) return "Remove all class incharge sections before changing the role.";
  if (next.status === "INACTIVE" && secs.length) return "Remove all class incharge sections before deactivating.";
  for (const sid of secs) {
    if (sectionDepartment(ctx.data, sid) !== next.departmentId) return "Class incharge sections must belong to the faculty's department.";
    const other = ctx.incharge.find((a) => a.sectionId === sid && a.facultyId !== next.id);
    if (other) {
      const o = ctx.faculty.find((f) => f.id === other.facultyId);
      const s = ctx.data.section.find((x) => x.id === sid);
      return `${s?.name ?? sid} already has a class incharge (${o?.name ?? "another faculty"}).`;
    }
  }
  return null;
}

/** Email change resets verification. */
export const normaliseFaculty = (next: Faculty, prev: Faculty | undefined): Faculty => {
  const email = next.email.trim().toLowerCase();
  return {
    ...next, name: next.name.trim(), email, employeeCode: next.employeeCode?.trim().toUpperCase() || undefined,
    emailVerified: prev && prev.email.toLowerCase() === email ? prev.emailVerified : false,
  };
};

export function checkStudent(actor: Role, next: Student, prev: Student | undefined, ctx: { students: Student[]; allowedSectionIds: string[]; data: MasterData }): string | null {
  if (actor !== "ADMIN" && actor !== "HOD") return "You are not allowed to edit students.";
  if (!ctx.allowedSectionIds.includes(next.sectionId)) return "You can only place students in sections of your own department.";
  if (prev && !ctx.allowedSectionIds.includes(prev.sectionId)) return "You can only edit students in your own department.";
  if (!next.name.trim() || !next.rollNo.trim() || !next.enrollmentNo.trim()) return "Name, roll no and enrollment no are required.";
  if (!next.sectionId || !next.sessionId || !next.semesterId) return "Section, session and semester are required.";
  if (!ctx.data.session.some((s) => s.id === next.sessionId)) return "Academic session not found.";
  if (!ctx.data.semester.some((s) => s.id === next.semesterId)) return "Semester not found.";
  const en = next.enrollmentNo.trim().toUpperCase();
  if (ctx.students.some((s) => s.id !== next.id && s.enrollmentNo.toUpperCase() === en)) return `Enrollment no ${en} already exists.`;
  const roll = next.rollNo.trim();
  if (ctx.students.some((s) => s.id !== next.id && s.sectionId === next.sectionId && s.rollNo === roll)) return `Roll no ${roll} is already used in this section.`;
  return null;
}

export const STUDENT_IMPORT_KEYS = ["rollNo", "enrollmentNo", "name", "department", "program", "class", "section", "session", "semester", "gender", "email", "phone"] as const;
type ImportKey = (typeof STUDENT_IMPORT_KEYS)[number];

/** Validates every row against master data and existing students. Never mutates anything. */
export function validateStudentImport(
  raw: Record<string, string>[], ctx: { students: Student[]; allowedSectionIds: string[]; data: MasterData; role: Role; required: string[]; headers: Record<string, string> },
): ValidatedRow<Student>[] {
  const { data } = ctx;
  const byCode = (rows: Row[], code: string) => rows.find((x) => x.code.toUpperCase() === code.toUpperCase());
  const seenEn = new Set(ctx.students.map((s) => s.enrollmentNo.toUpperCase()));
  const seenRoll = new Set(ctx.students.map((s) => `${s.sectionId}|${s.rollNo}`));
  let counter = ctx.students as unknown as Row[];
  const stamp = Date.now();
  return raw.map((r0, i) => {
    const r = Object.fromEntries(STUDENT_IMPORT_KEYS.map((k) => [k, (r0[k] ?? "").trim()])) as Record<ImportKey, string>;
    const errors: string[] = [];
    ctx.required.filter((k) => !r[k as ImportKey]).forEach((k) => errors.push(`${ctx.headers[k] ?? k} missing`));
    const dep = r.department ? byCode(data.department, r.department) : undefined;
    if (r.department && !dep) errors.push(`Department ${r.department} not found`);
    const prog = r.program ? byCode(data.program, r.program) : undefined;
    if (r.program && !prog) errors.push(`Program ${r.program} not found`);
    else if (prog && dep && prog.departmentId !== dep.id) errors.push(`Program ${r.program} is not in department ${r.department}`);
    const cls = r.class ? byCode(data.class, r.class) : undefined;
    if (r.class && !cls) errors.push(`Class ${r.class} not found`);
    else if (cls && prog && cls.programId !== prog.id) errors.push(`Class ${r.class} is not in program ${r.program}`);
    const sec = r.section ? byCode(data.section, r.section) : undefined;
    if (r.section && !sec) errors.push(`Section ${r.section} not found`);
    else if (sec && cls && sec.classId !== cls.id) errors.push(`Section ${r.section} is not in class ${r.class}`);
    else if (sec && !ctx.allowedSectionIds.includes(sec.id)) errors.push(`Section ${r.section} is outside your department`);
    const ses = r.session ? data.session.find((x) => x.name === r.session || x.code.toUpperCase() === r.session.toUpperCase()) : undefined;
    if (r.session && !ses) errors.push(`Session ${r.session} not found`);
    const sem = r.semester ? data.semester.find((x) => String(x.number) === r.semester) : undefined;
    if (r.semester && !sem) errors.push(`Semester ${r.semester} not found`);
    const en = r.enrollmentNo.toUpperCase();
    if (en && seenEn.has(en)) errors.push(`Enrollment No ${en} already exists`);
    const rk = sec ? `${sec.id}|${r.rollNo}` : "";
    if (sec && r.rollNo && seenRoll.has(rk)) errors.push(`Roll No ${r.rollNo} already used in ${sec.name}`);
    const g = r.gender.toUpperCase();
    if (g && !["MALE", "FEMALE", "OTHER"].includes(g)) errors.push("Gender must be MALE, FEMALE or OTHER");
    if (r.email && !/^\S+@\S+\.\S+$/.test(r.email)) errors.push("Email is not valid");
    if (errors.length) return { line: i + 2, raw: r0, errors };
    seenEn.add(en); seenRoll.add(rk);
    const code = nextCode(counter, "STU");
    const value: Student = {
      id: `st-${stamp}-${i}`, code, rollNo: r.rollNo, enrollmentNo: en, name: r.name, email: r.email || undefined, phone: r.phone || undefined,
      gender: (g || undefined) as Student["gender"], sectionId: sec!.id, sessionId: ses!.id, semesterId: sem!.id, status: "ACTIVE",
    };
    counter = [...counter, value as unknown as Row];
    return { line: i + 2, raw: r0, errors, value };
  });
}
