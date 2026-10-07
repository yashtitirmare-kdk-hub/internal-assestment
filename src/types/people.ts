import type { Role, Status } from "@/lib/iams-data";

/** Application user (staff). Students are NOT users. */
export interface Faculty {
  id: string;
  code: string; // FAC001
  name: string;
  email: string;
  employeeCode?: string | undefined;
  departmentId: string;
  role: Role;
  status: Status;
  emailVerified: boolean;
}

/** Section-wise class incharge: Faculty → Class → Section (class derived from section). */
export interface InchargeAssignment {
  id: string;
  facultyId: string;
  sectionId: string;
}

export interface Student {
  id: string;
  code: string; // STU001
  rollNo: string;
  enrollmentNo: string;
  name: string;
  email?: string | undefined;
  phone?: string | undefined;
  gender?: "MALE" | "FEMALE" | "OTHER" | undefined;
  sectionId: string;
  sessionId: string;
  semesterId: string;
  status: Status;
}
