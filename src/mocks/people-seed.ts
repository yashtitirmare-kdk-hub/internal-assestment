import type { Faculty, InchargeAssignment, Student } from "@/types/people";

/** Mock data only. Replaced by REST API responses later. */
export const DEMO_CLASS_INCHARGE_ID = "f3";
export const DEMO_FACULTY_ID = "f4";

export function seedFaculty(): Faculty[] {
  return [
    { id: "f1", code: "FAC001", name: "Dr. Meera Kulkarni", email: "meera.k@sxcs.edu.in", employeeCode: "EMP1021", departmentId: "d1", role: "HOD", status: "ACTIVE", emailVerified: true },
    { id: "f2", code: "FAC002", name: "Prof. Anil Deshmukh", email: "anil.d@sxcs.edu.in", employeeCode: "EMP1034", departmentId: "d2", role: "HOD", status: "ACTIVE", emailVerified: true },
    { id: "f3", code: "FAC003", name: "Ms. Priya Joshi", email: "priya.j@sxcs.edu.in", employeeCode: "EMP1102", departmentId: "d1", role: "CLASS_INCHARGE", status: "ACTIVE", emailVerified: true },
    { id: "f4", code: "FAC004", name: "Mr. Rahul Patil", email: "rahul.p@sxcs.edu.in", departmentId: "d1", role: "FACULTY", status: "ACTIVE", emailVerified: false },
    { id: "f5", code: "FAC005", name: "Dr. Sana Shaikh", email: "sana.s@sxcs.edu.in", employeeCode: "EMP1150", departmentId: "d2", role: "CLASS_INCHARGE", status: "ACTIVE", emailVerified: true },
    { id: "f6", code: "FAC006", name: "Mr. Vikram Rao", email: "vikram.r@sxcs.edu.in", departmentId: "d2", role: "FACULTY", status: "INACTIVE", emailVerified: true },
    { id: "f7", code: "FAC007", name: "Admin Office", email: "admin@sxcs.edu.in", departmentId: "d1", role: "ADMIN", status: "ACTIVE", emailVerified: true },
  ];
}

export function seedIncharge(): InchargeAssignment[] {
  return [
    { id: "ci1", facultyId: "f3", sectionId: "x1" },
    { id: "ci2", facultyId: "f3", sectionId: "x2" },
    { id: "ci3", facultyId: "f3", sectionId: "x3" },
    { id: "ci4", facultyId: "f5", sectionId: "x5" },
  ];
}

const NAMES = ["Aarav Shah", "Isha Mehta", "Rohan Gupta", "Sneha Pawar", "Kabir Singh", "Ananya Iyer", "Omkar Jadhav", "Riya Nair", "Yash More", "Tanvi Bhosale", "Arjun Reddy", "Neha Kapoor"];
const SECTIONS = ["x1", "x1", "x1", "x2", "x2", "x2", "x3", "x3", "x4", "x5", "x5", "x5"];
const SEM: Record<string, string> = { x1: "sm1", x2: "sm1", x3: "sm1", x4: "sm1", x5: "sm1" };

export function seedStudents(): Student[] {
  return NAMES.map((name, i) => {
    const n = i + 1;
    const g = (["MALE", "FEMALE"] as const)[i % 2];
    return {
      id: `st${n}`,
      code: `STU${String(n).padStart(3, "0")}`,
      rollNo: String(100 + n),
      enrollmentNo: `EN2026${String(n).padStart(4, "0")}`,
      name,
      email: `${name.split(" ")[0]!.toLowerCase()}@student.sxcs.edu.in`,
      gender: g!,
      sectionId: SECTIONS[i]!,
      sessionId: "s1",
      semesterId: SEM[SECTIONS[i]!]!,
      status: i === 11 ? "INACTIVE" : "ACTIVE",
    };
  });
}

export const seedAssignments = (): import("@/types/people").FacultyAssignment[] => [
  { id: "fa1", facultyId: "f4", classId: "k3", subjectId: "u3", sectionIds: ["x3", "x4"], sessionId: "s1" },
  { id: "fa2", facultyId: "f3", classId: "k1", subjectId: "u1", sectionIds: ["x1"], sessionId: "s1" },
  { id: "fa3", facultyId: "f5", classId: "k4", subjectId: "u5", sectionIds: ["x5"], sessionId: "s1" },
];
