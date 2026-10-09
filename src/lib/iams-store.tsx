import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  departmentOf, HOD_DEPARTMENT_ID, makeSeed, type EntityKind, type MasterData, type Role, type Row,
} from "./iams-data";
import type { Faculty, FacultyAssignment, InchargeAssignment, Student } from "@/types/people";
import { checkAssignment } from "@/services/assignment-rules";
import { checkFaculty, checkStudent, normaliseFaculty, sectionDepartment, visibleSectionIds } from "@/services/people-rules";
import { DEMO_CLASS_INCHARGE_ID, DEMO_FACULTY_ID, seedAssignments, seedFaculty, seedIncharge, seedStudents } from "@/mocks/people-seed";

interface Store {
  role: Role;
  setRole: (r: Role) => void;
  data: MasterData;
  /** Rows visible to the current role. */
  scoped: (k: EntityKind) => Row[];
  upsert: (k: EntityKind, row: Row) => void;
  remove: (k: EntityKind, id: string) => void;

  faculty: Faculty[];
  /** Saves faculty + their class incharge sections atomically. Returns an error message, or null on success. */
  saveFaculty: (f: Faculty, sectionIds?: string[]) => string | null;
  incharge: InchargeAssignment[];
  students: Student[];
  /** All-or-nothing: if any student fails a rule, nothing is saved. Returns an error message or null. */
  saveStudents: (s: Student[]) => string | null;
  /** Section ids whose students the current role may see. */
  visibleSectionIds: string[];
  /** Department that owns a section. */
  sectionDept: (sectionId: string) => string | undefined;
  /** Sections the demo user is responsible for (CLASS_INCHARGE). */
  mySectionIds: string[];
  assignments: FacultyAssignment[];
  saveAssignment: (a: FacultyAssignment) => string | null;
  removeAssignment: (id: string) => void;
  /** Faculty id of the demo user for non-management roles. */
  myFacultyId: string | null;
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
  const [assignments, setAssignments] = useState<FacultyAssignment[]>(() => seedAssignments());
  const [students, setStudents] = useState<Student[]>(() => seedStudents());

  const value = useMemo<Store>(() => {
    const sectionDept = (id: string) => sectionDepartment(data, id);
    const mySectionIds = incharge.filter((a) => a.facultyId === DEMO_CLASS_INCHARGE_ID).map((a) => a.sectionId);
    const visible = visibleSectionIds(role, data, mySectionIds);
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
      saveFaculty: (f, sectionIds) => {
        const prev = faculty.find((x) => x.id === f.id);
        const secs = sectionIds ?? incharge.filter((a) => a.facultyId === f.id).map((a) => a.sectionId);
        const err = checkFaculty(role, f, prev, { faculty, incharge, sectionIds: secs, data });
        if (err) return err;
        setFaculty((l) => upsertList(l, [normaliseFaculty(f, prev)]));
        setIncharge((l) => [
          ...l.filter((a) => a.facultyId !== f.id),
          ...secs.map((sectionId) => ({ id: `ci-${f.id}-${sectionId}`, facultyId: f.id, sectionId })),
        ]);
        return null;
      },
      incharge,
      students,
      saveStudents: (list) => {
        let working = students;
        for (const st of list) {
          const err = checkStudent(role, st, students.find((x) => x.id === st.id), { students: working, allowedSectionIds: role === "CLASS_INCHARGE" ? [] : visible, data });
          if (err) return `${st.name || st.code}: ${err}`;
          working = upsertList(working, [st]);
        }
        setStudents(working);
        return null;
      },
      visibleSectionIds: visible,
      sectionDept,
      mySectionIds,
      assignments,
      saveAssignment: (a) => {
        const err = checkAssignment(role, a, { data, faculty, assignments });
        if (err) return err;
        setAssignments((l) => upsertList(l, [a]));
        return null;
      },
      removeAssignment: (id) => { if (role === "ADMIN" || role === "HOD") setAssignments((l) => l.filter((x) => x.id !== id)); },
      myFacultyId: role === "FACULTY" ? DEMO_FACULTY_ID : role === "CLASS_INCHARGE" ? DEMO_CLASS_INCHARGE_ID : null,
    };
  }, [role, data, faculty, incharge, students, assignments]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIams() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useIams outside provider");
  return c;
}
