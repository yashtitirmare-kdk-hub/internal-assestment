import { departmentOf, HOD_DEPARTMENT_ID, type MasterData, type Role } from "@/lib/iams-data";
import type { Faculty, FacultyAssignment } from "@/types/people";

/** Returns an error message, or null when the assignment may be saved. */
export function checkAssignment(
  role: Role, a: FacultyAssignment,
  ctx: { data: MasterData; faculty: Faculty[]; assignments: FacultyAssignment[] },
): string | null {
  if (role !== "ADMIN" && role !== "HOD") return "You cannot manage faculty assignments.";
  const { data } = ctx;
  const f = ctx.faculty.find((x) => x.id === a.facultyId);
  if (!f) return "Select a faculty member.";
  if (f.status !== "ACTIVE") return `${f.name} is inactive.`;
  if (f.role === "ADMIN") return "Admin accounts cannot be given subjects.";
  const cls = data.class.find((c) => c.id === a.classId);
  if (!cls) return "Select a class.";
  const dept = departmentOf("class", cls, data);
  if (role === "HOD" && (dept !== HOD_DEPARTMENT_ID || f.departmentId !== HOD_DEPARTMENT_ID)) return "This is outside your department.";
  if (f.departmentId !== dept) return `${f.name} does not belong to this class's department.`;
  const sub = data.subject.find((s) => s.id === a.subjectId);
  if (!sub) return "Select a subject.";
  if (sub.programId !== cls.programId) return "This subject is not taught in the selected class.";
  if (sub.status !== "ACTIVE") return "This subject is inactive.";
  if (a.sectionIds.length === 0) return "Select at least one section.";
  if (a.sectionIds.some((id) => data.section.find((s) => s.id === id)?.classId !== a.classId)) return "A selected section does not belong to this class.";
  const ses = data.session.find((s) => s.id === a.sessionId);
  if (!ses) return "Select an academic session.";
  if (ses.status !== "ACTIVE") return "This academic session is inactive.";
  for (const o of ctx.assignments) {
    if (o.id === a.id || o.subjectId !== a.subjectId || o.sessionId !== a.sessionId) continue;
    const clash = o.sectionIds.find((s) => a.sectionIds.includes(s));
    if (clash) {
      const who = ctx.faculty.find((x) => x.id === o.facultyId)?.name ?? "another faculty";
      const sec = data.section.find((s) => s.id === clash)?.name ?? clash;
      return `${sec} already has this subject assigned to ${who}.`;
    }
  }
  return null;
}
