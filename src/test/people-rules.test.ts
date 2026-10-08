import { describe, expect, it } from "vitest";
import { makeSeed } from "@/lib/iams-data";
import { seedFaculty, seedIncharge, seedStudents } from "@/mocks/people-seed";
import { checkFaculty, checkStudent, normaliseFaculty, validateStudentImport, visibleSectionIds } from "@/services/people-rules";
import type { Faculty, Student } from "@/types/people";

const data = makeSeed();
const faculty = seedFaculty();
const incharge = seedIncharge();
const students = seedStudents();
const fac = (id: string) => faculty.find((f) => f.id === id)!;
const secsOf = (id: string) => incharge.filter((a) => a.facultyId === id).map((a) => a.sectionId);
const fctx = (sectionIds: string[]) => ({ faculty, incharge, sectionIds, data });
const newFac: Faculty = { id: "fn", code: "FAC008", name: "New Person", email: "new@x.edu", departmentId: "d1", role: "FACULTY", status: "ACTIVE", emailVerified: false };

describe("Faculty rules", () => {
  it("admin can create faculty in any department", () => {
    expect(checkFaculty("ADMIN", { ...newFac, departmentId: "d2" }, undefined, fctx([]))).toBeNull();
  });
  it("blocks duplicate email (case-insensitive) and employee code", () => {
    expect(checkFaculty("ADMIN", { ...newFac, email: "PRIYA.J@sxcs.edu.in" }, undefined, fctx([]))).toMatch(/already used/);
    expect(checkFaculty("ADMIN", { ...newFac, employeeCode: "emp1102" }, undefined, fctx([]))).toMatch(/already in use/);
  });
  it("email change resets verification, unchanged email keeps it", () => {
    const p = fac("f3");
    expect(normaliseFaculty({ ...p, email: "other@x.edu" }, p).emailVerified).toBe(false);
    expect(normaliseFaculty({ ...p, name: "Renamed" }, p).emailVerified).toBe(true);
  });
  it("HOD scope: own department only, only FACULTY/CLASS_INCHARGE", () => {
    expect(checkFaculty("HOD", { ...newFac, departmentId: "d2" }, undefined, fctx([]))).toMatch(/own department/);
    expect(checkFaculty("HOD", { ...fac("f5"), name: "x" }, fac("f5"), fctx([]))).toMatch(/own department/);
    expect(checkFaculty("HOD", { ...newFac, role: "HOD" }, undefined, fctx([]))).toMatch(/only assign/);
    expect(checkFaculty("HOD", { ...newFac, role: "ADMIN" }, undefined, fctx([]))).toMatch(/only assign/);
    expect(checkFaculty("HOD", { ...fac("f4"), departmentId: "d2" }, fac("f4"), fctx([]))).toMatch(/own department/);
    expect(checkFaculty("HOD", { ...fac("f1"), name: "x" }, fac("f1"), fctx([]))).toMatch(/cannot edit/);
    expect(checkFaculty("HOD", newFac, undefined, fctx([]))).toBeNull();
  });
  it("class incharge: one/many/none sections, conflicts and ordering rules", () => {
    const p = fac("f3");
    expect(checkFaculty("ADMIN", p, p, fctx(["x1"]))).toBeNull();
    expect(checkFaculty("ADMIN", p, p, fctx(["x1", "x2", "x3", "x4"]))).toBeNull();
    expect(checkFaculty("ADMIN", p, p, fctx([]))).toBeNull();
    expect(checkFaculty("ADMIN", { ...fac("f4"), role: "CLASS_INCHARGE" }, fac("f4"), fctx(["x1"]))).toMatch(/already has a class incharge \(Ms. Priya Joshi\)/);
    expect(checkFaculty("ADMIN", p, p, fctx(["x5"]))).toMatch(/faculty's department/);
    expect(checkFaculty("ADMIN", { ...p, role: "FACULTY" }, p, fctx(secsOf("f3")))).toMatch(/before changing the role/);
    expect(checkFaculty("ADMIN", { ...p, status: "INACTIVE" }, p, fctx(secsOf("f3")))).toMatch(/before deactivating/);
    expect(checkFaculty("ADMIN", { ...p, role: "FACULTY" }, p, fctx([]))).toBeNull();
    expect(checkFaculty("ADMIN", { ...p, status: "INACTIVE" }, p, fctx([]))).toBeNull();
  });
  it("class incharge and faculty roles cannot manage faculty", () => {
    expect(checkFaculty("CLASS_INCHARGE", newFac, undefined, fctx([]))).toMatch(/not allowed/);
    expect(checkFaculty("FACULTY", newFac, undefined, fctx([]))).toMatch(/not allowed/);
  });
});

const st = (o: Partial<Student> = {}): Student => ({
  id: "sn", code: "STU013", rollNo: "999", enrollmentNo: "EN-NEW", name: "New Student", sectionId: "x1", sessionId: "s1", semesterId: "sm1", status: "ACTIVE", ...o,
});
const sctx = (role: "ADMIN" | "HOD") => ({ students, allowedSectionIds: visibleSectionIds(role, data, []), data });

describe("Student rules", () => {
  it("visible sections per role", () => {
    expect(visibleSectionIds("ADMIN", data, [])).toHaveLength(5);
    expect(visibleSectionIds("HOD", data, []).sort()).toEqual(["x1", "x2", "x3", "x4"]);
    expect(visibleSectionIds("CLASS_INCHARGE", data, ["x1", "x2"])).toEqual(["x1", "x2"]);
    expect(visibleSectionIds("FACULTY", data, ["x1"])).toEqual([]);
  });
  it("enrollment no is globally unique; roll no unique only within a section", () => {
    expect(checkStudent("ADMIN", st({ enrollmentNo: "en20260001" }), undefined, sctx("ADMIN"))).toMatch(/Enrollment/);
    expect(checkStudent("ADMIN", st({ rollNo: "101", sectionId: "x1" }), undefined, sctx("ADMIN"))).toMatch(/Roll no 101/);
    expect(checkStudent("ADMIN", st({ rollNo: "101", sectionId: "x2" }), undefined, sctx("ADMIN"))).toBeNull();
  });
  it("editing keeps own enrollment/roll without conflict", () => {
    const s1 = students[0]!;
    expect(checkStudent("ADMIN", { ...s1, name: "Edited" }, s1, sctx("ADMIN"))).toBeNull();
  });
  it("HOD cannot create/edit/move into another department; class incharge and faculty cannot edit", () => {
    expect(checkStudent("HOD", st({ sectionId: "x5" }), undefined, sctx("HOD"))).toMatch(/own department/);
    const other = students.find((s) => s.sectionId === "x5")!;
    expect(checkStudent("HOD", { ...other, sectionId: "x1", rollNo: "555" }, other, sctx("HOD"))).toMatch(/own department/);
    expect(checkStudent("CLASS_INCHARGE", st(), undefined, { ...sctx("ADMIN"), allowedSectionIds: [] })).toMatch(/not allowed/);
    expect(checkStudent("FACULTY", st(), undefined, sctx("ADMIN"))).toMatch(/not allowed/);
  });
});

const REQ = ["rollNo", "enrollmentNo", "name", "department", "program", "class", "section", "session", "semester"];
const good = { rollNo: "201", enrollmentNo: "EN9001", name: "Imported One", department: "DEP001", program: "PROG001", class: "CLS001", section: "SEC001", session: "2026-2027", semester: "1", gender: "", email: "", phone: "" };
const run = (rows: Record<string, string>[], role: "ADMIN" | "HOD" = "ADMIN") =>
  validateStudentImport(rows, { ...sctx(role), role, required: REQ, headers: {} });

describe("Student import validation", () => {
  it("valid file produces sequential STU codes", () => {
    const r = run([good, { ...good, rollNo: "202", enrollmentNo: "EN9002" }]);
    expect(r.every((x) => x.errors.length === 0)).toBe(true);
    expect(r.map((x) => x.value!.code)).toEqual(["STU013", "STU014"]);
  });
  it("flags missing required field", () => {
    expect(run([{ ...good, name: "" }])[0]!.errors.join()).toMatch(/name missing/);
  });
  it("flags duplicate enrollment (existing and within file)", () => {
    expect(run([{ ...good, enrollmentNo: "EN20260001" }])[0]!.errors.join()).toMatch(/Enrollment/);
    const r = run([good, { ...good, rollNo: "203" }]);
    expect(r[1]!.errors.join()).toMatch(/Enrollment/);
  });
  it("flags duplicate roll in same section, allows it in another section", () => {
    expect(run([{ ...good, rollNo: "101" }])[0]!.errors.join()).toMatch(/Roll No 101/);
    expect(run([{ ...good, rollNo: "101", class: "CLS001", section: "SEC002" }])[0]!.errors).toEqual([]);
    const r = run([good, { ...good, enrollmentNo: "EN9002" }]);
    expect(r[1]!.errors.join()).toMatch(/Roll No 201/);
  });
  it("flags invalid department / program / class / section / session", () => {
    expect(run([{ ...good, department: "DEP999" }])[0]!.errors.join()).toMatch(/Department DEP999 not found/);
    expect(run([{ ...good, program: "PROG999" }])[0]!.errors.join()).toMatch(/Program PROG999 not found/);
    expect(run([{ ...good, program: "PROG003" }])[0]!.errors.join()).toMatch(/not in department/);
    expect(run([{ ...good, class: "CLS999" }])[0]!.errors.join()).toMatch(/Class CLS999 not found/);
    expect(run([{ ...good, class: "CLS002" }])[0]!.errors.join()).toMatch(/not in class/);
    expect(run([{ ...good, section: "SEC999" }])[0]!.errors.join()).toMatch(/Section SEC999 not found/);
    expect(run([{ ...good, session: "1999-2000" }])[0]!.errors.join()).toMatch(/Session 1999-2000 not found/);
  });
  it("HOD cannot import into another department", () => {
    const r = run([{ ...good, department: "DEP002", program: "PROG003", class: "CLS004", section: "SEC005" }], "HOD");
    expect(r[0]!.errors.join()).toMatch(/outside your department/);
  });
  it("mixed file: only valid rows carry values; input data is untouched", () => {
    const before = JSON.stringify(students);
    const r = run([good, { ...good, section: "SEC999", enrollmentNo: "EN9003" }, { ...good, rollNo: "204", enrollmentNo: "EN9004" }]);
    expect(r.map((x) => x.errors.length === 0)).toEqual([true, false, true]);
    expect(r.filter((x) => x.value)).toHaveLength(2);
    expect(JSON.stringify(students)).toBe(before);
  });
});
