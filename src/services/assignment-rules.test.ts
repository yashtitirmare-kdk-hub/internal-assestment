import { describe, expect, it } from "vitest";
import { makeSeed } from "@/lib/iams-data";
import { seedAssignments, seedFaculty } from "@/mocks/people-seed";
import { checkAssignment } from "./assignment-rules";

const ctx = { data: makeSeed(), faculty: seedFaculty(), assignments: seedAssignments() };
const base = { id: "new", facultyId: "f4", classId: "k3", subjectId: "u4", sectionIds: ["x3"], sessionId: "s1" };

describe("checkAssignment", () => {
  it("accepts a valid assignment", () => expect(checkAssignment("ADMIN", base, ctx)).toBeNull());
  it("rejects subject from another program", () => expect(checkAssignment("ADMIN", { ...base, subjectId: "u1" }, ctx)).toMatch(/not taught/));
  it("rejects section of another class", () => expect(checkAssignment("ADMIN", { ...base, sectionIds: ["x1"] }, ctx)).toMatch(/section/));
  it("rejects clash", () => expect(checkAssignment("ADMIN", { ...base, facultyId: "f3", subjectId: "u3" }, ctx)).toMatch(/already has/));
  it("HOD limited to own department", () => expect(checkAssignment("HOD", { ...base, facultyId: "f5", classId: "k4", subjectId: "u5", sectionIds: ["x5"] }, ctx)).toMatch(/outside/));
  it("rejects inactive session", () => expect(checkAssignment("ADMIN", { ...base, sessionId: "s2" }, ctx)).toMatch(/inactive/));
  it("faculty role cannot manage", () => expect(checkAssignment("FACULTY", base, ctx)).toMatch(/cannot/));
});
