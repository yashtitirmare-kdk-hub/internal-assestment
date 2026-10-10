import type { SchemeComponent, SchemeVersion } from "@/types/scheme";

/** Mock data only. Replaced by REST API responses later. Marks are examples, all editable. */
const c = (id: string, name: string, code: string, type: SchemeComponent["type"], maxMarks: number, weightage: number, sequence: number, passMarks?: number): SchemeComponent =>
  ({ id, name, code, type, maxMarks, weightage, sequence, passMarks, active: true });

export function seedSchemes(): SchemeVersion[] {
  return [
    {
      id: "sv1", code: "SCH001", version: 1, name: "BCA Theory Internal", type: "THEORY", departmentId: "d1", programId: "p1", semesterId: "sm1",
      weightageRule: "TOTAL_100", status: "INACTIVE", note: "Replaced by Version 2",
      components: [c("c11", "Class Test I", "CT1", "THEORY", 20, 50, 1, 8), c("c12", "Class Test II", "CT2", "THEORY", 20, 50, 2, 8)],
    },
    {
      id: "sv2", code: "SCH001", version: 2, name: "BCA Theory Internal", type: "THEORY", departmentId: "d1", programId: "p1", semesterId: "sm1",
      weightageRule: "TOTAL_100", status: "ACTIVE",
      components: [
        c("c21", "Class Test I", "CT1", "THEORY", 20, 30, 1, 8),
        c("c22", "Class Test II", "CT2", "THEORY", 20, 30, 2, 8),
        c("c23", "Assignment", "ASG", "THEORY", 10, 25, 3),
        c("c24", "Attendance", "ATT", "THEORY", 5, 15, 4),
      ],
    },
    {
      id: "sv3", code: "SCH002", version: 1, name: "BCA Lab Internal", type: "PRACTICAL", departmentId: "d1", programId: "p1", semesterId: "sm1",
      weightageRule: "TOTAL_100", status: "ACTIVE",
      components: [
        c("c31", "Lab Journal", "JRN", "PRACTICAL", 10, 30, 1),
        c("c32", "Practical Exam", "PEX", "PRACTICAL", 30, 50, 2, 12),
        c("c33", "Viva", "VIVA", "PRACTICAL", 10, 20, 3),
      ],
    },
    {
      id: "sv4", code: "SCH003", version: 1, name: "MCA Theory + Lab", type: "MIXED", departmentId: "d1", programId: "p2",
      weightageRule: "NO_TOTAL", status: "DRAFT",
      components: [
        c("c41", "Mid Term Test", "MID", "THEORY", 30, 40, 1, 12),
        c("c42", "Mini Project", "PRJ", "PRACTICAL", 25, 40, 2, 10),
        c("c43", "Seminar", "SEM", "THEORY", 10, 20, 3),
      ],
    },
    {
      id: "sv5", code: "SCH004", version: 1, name: "B.Sc CS Theory Internal", type: "THEORY", departmentId: "d2", programId: "p3", semesterId: "sm1",
      weightageRule: "TOTAL_100", status: "ACTIVE",
      components: [c("c51", "Unit Test", "UT", "THEORY", 25, 70, 1, 10), c("c52", "Quiz", "QZ", "THEORY", 10, 30, 2)],
    },
  ];
}
