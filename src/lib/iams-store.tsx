import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  departmentOf, HOD_DEPARTMENT_ID, makeSeed, type EntityKind, type MasterData, type Role, type Row,
} from "./iams-data";
import type { Faculty, InchargeAssignment, Student } from "@/types/people";
import { DEMO_CLASS_INCHARGE_ID, seedFaculty, seedIncharge, seedStudents } from "@/mocks/people-seed";

interface Store {
  role: Role;
  setRole: (r: Role) => void;
  data: MasterData;
  /** Rows visible to the current role. */
  scoped: (k: EntityKind) => Row[];
  upsert: (k: EntityKind, row: Row) => void;
  remove: (k: EntityKind, id: string) => void;

  faculty: Faculty[];
  upsertFaculty: (f: Faculty) => void;
  incharge: InchargeAssignment[];
  setInchargeFor: (facultyId: string, sectionIds: string[]) => void;
  students: Student[];
  upsertStudents: (s: Student[]) => void;
  /** Department that owns a section. */
  sectionDept: (sectionId: string) => string | undefined;
  /** Sections the demo user is responsible for (CLASS_INCHARGE). */
  mySectionIds: string[];
}

const Ctx = createContext<Store | null>(null);

const upsertList = <T extends { id: string }>(list: T[], items: T[]) => {
  const map = new Map(list.map((x) => [x.id, x]));
  items.forEach((i) => map.set(i.id, i));
  return [...map.values()];
};

export function IamsProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("ADMIN");
  const [data, setData] = useState<MasterData>(() => makeSeed());
  const [faculty, setFaculty] = useState<Faculty[]>(() => seedFaculty());
  const [incharge, setIncharge] = useState<InchargeAssignment[]>(() => seedIncharge());
  const [students, setStudents] = useState<Student[]>(() => seedStudents());

  const value = useMemo<Store>(() => {
    const sectionDept = (id: string) => {
      const s = data.section.find((x) => x.id === id);
      return s ? departmentOf("section", s, data) : undefined;
    };
    return {
      role,
      setRole,
      data,
      scoped: (k) =>
        role === "ADMIN" ? data[k] : data[k].filter((r) => departmentOf(k, r, data) === HOD_DEPARTMENT_ID),
      upsert: (k, row) =>
        setData((d) => ({
          ...d,
          [k]: d[k].some((r) => r.id === row.id) ? d[k].map((r) => (r.id === row.id ? row : r)) : [...d[k], row],
        })),
      remove: (k, id) => setData((d) => ({ ...d, [k]: d[k].filter((r) => r.id !== id) })),
      faculty,
      upsertFaculty: (f) => setFaculty((l) => upsertList(l, [f])),
      incharge,
      setInchargeFor: (facultyId, sectionIds) =>
        setIncharge((l) => [
          ...l.filter((a) => a.facultyId !== facultyId),
          ...sectionIds.map((sectionId) => ({ id: `ci-${facultyId}-${sectionId}`, facultyId, sectionId })),
        ]),
      students,
      upsertStudents: (s) => setStudents((l) => upsertList(l, s)),
      sectionDept,
      mySectionIds: incharge.filter((a) => a.facultyId === DEMO_CLASS_INCHARGE_ID).map((a) => a.sectionId),
    };
  }, [role, data, faculty, incharge, students]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIams() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useIams outside provider");
  return c;
}
