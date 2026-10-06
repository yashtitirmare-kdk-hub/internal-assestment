export type Role = "ADMIN" | "HOD" | "CLASS_INCHARGE" | "FACULTY";
export type Status = "ACTIVE" | "INACTIVE";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  HOD: "Head of Department",
  CLASS_INCHARGE: "Class Incharge",
  FACULTY: "Faculty",
};

export type EntityKind =
  | "college"
  | "department"
  | "session"
  | "semester"
  | "program"
  | "class"
  | "section"
  | "subject";

export interface Row {
  id: string;
  code: string;
  name: string;
  status: Status;
  collegeId?: string;
  departmentId?: string;
  programId?: string;
  classId?: string;
  city?: string;
  courseType?: string;
  duration?: number;
  year?: number;
  number?: number;
  [key: string]: string | number | undefined;
}

export type MasterData = Record<EntityKind, Row[]>;

export const ENTITY_META: Record<EntityKind, { label: string; plural: string; prefix: string }> = {
  college: { label: "College", plural: "Colleges", prefix: "COL" },
  department: { label: "Department", plural: "Departments", prefix: "DEP" },
  session: { label: "Academic Session", plural: "Academic Sessions", prefix: "SES" },
  semester: { label: "Semester", plural: "Semesters", prefix: "SEM" },
  program: { label: "Program", plural: "Programs", prefix: "PROG" },
  class: { label: "Class", plural: "Classes", prefix: "CLS" },
  section: { label: "Section", plural: "Sections", prefix: "SEC" },
  subject: { label: "Subject", plural: "Subjects", prefix: "SUB" },
};

export const ADMIN_KINDS: EntityKind[] = [
  "college", "department", "session", "semester", "program", "class", "section", "subject",
];
export const HOD_KINDS: EntityKind[] = ["program", "class", "section", "subject"];

/** Demo HOD belongs to this department. */
export const HOD_DEPARTMENT_ID = "d1";

const A: Status = "ACTIVE";

export function makeSeed(): MasterData {
  return {
    college: [{ id: "c1", code: "COL001", name: "St. Xavier's College of Science", city: "Pune", status: A }],
    department: [
      { id: "d1", code: "DEP001", name: "Computer Applications", collegeId: "c1", status: A },
      { id: "d2", code: "DEP002", name: "Computer Science", collegeId: "c1", status: A },
      { id: "d3", code: "DEP003", name: "Commerce", collegeId: "c1", status: "INACTIVE" },
    ],
    session: [
      { id: "s1", code: "SES001", name: "2026-2027", status: A },
      { id: "s2", code: "SES002", name: "2025-2026", status: "INACTIVE" },
    ],
    semester: [1, 2, 3, 4, 5, 6].map((n) => ({
      id: `sm${n}`, code: `SEM00${n}`, name: `Semester ${n}`, number: n, status: A,
    })),
    program: [
      { id: "p1", code: "PROG001", name: "BCA", departmentId: "d1", duration: 3, status: A },
      { id: "p2", code: "PROG002", name: "MCA", departmentId: "d1", duration: 2, status: A },
      { id: "p3", code: "PROG003", name: "B.Sc Computer Science", departmentId: "d2", duration: 3, status: A },
    ],
    class: [
      { id: "k1", code: "CLS001", name: "BCA 1st Year", programId: "p1", year: 1, status: A },
      { id: "k2", code: "CLS002", name: "BCA 2nd Year", programId: "p1", year: 2, status: A },
      { id: "k3", code: "CLS003", name: "MCA 1st Year", programId: "p2", year: 1, status: A },
      { id: "k4", code: "CLS004", name: "B.Sc CS 1st Year", programId: "p3", year: 1, status: A },
    ],
    section: [
      { id: "x1", code: "SEC001", name: "BCA 1st A", classId: "k1", status: A },
      { id: "x2", code: "SEC002", name: "BCA 1st B", classId: "k1", status: A },
      { id: "x3", code: "SEC003", name: "MCA 1st A", classId: "k3", status: A },
      { id: "x4", code: "SEC004", name: "MCA 1st B", classId: "k3", status: A },
      { id: "x5", code: "SEC005", name: "B.Sc CS 1st A", classId: "k4", status: A },
    ],
    subject: [
      { id: "u1", code: "SUB101", name: "Programming in C", programId: "p1", courseType: "THEORY", status: A },
      { id: "u2", code: "SUB102", name: "C Programming Lab", programId: "p1", courseType: "PRACTICAL", status: A },
      { id: "u3", code: "SUB101", name: "Advanced Database Management", programId: "p2", courseType: "THEORY", status: A },
      { id: "u4", code: "SUB102", name: "Machine Learning", programId: "p2", courseType: "THEORY", status: A },
      { id: "u5", code: "CS101", name: "Discrete Mathematics", programId: "p3", courseType: "THEORY", status: A },
    ],
  };
}

export function nextCode(rows: Row[], prefix: string) {
  const max = rows.reduce((m, r) => {
    const n = parseInt(r.code.replace(prefix, ""), 10);
    return Number.isFinite(n) && r.code.startsWith(prefix) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** Department that owns a row, used for HOD scoping. */
export function departmentOf(kind: EntityKind, row: Row, d: MasterData): string | undefined {
  const find = (k: EntityKind, id: unknown) => d[k].find((r) => r.id === id);
  switch (kind) {
    case "department": return row.id;
    case "program": return row.departmentId;
    case "class": return find("program", row.programId)?.departmentId as string;
    case "subject": return find("program", row.programId)?.departmentId as string;
    case "section": {
      const c = find("class", row.classId);
      return find("program", c?.programId)?.departmentId as string;
    }
    default: return undefined;
  }
}
