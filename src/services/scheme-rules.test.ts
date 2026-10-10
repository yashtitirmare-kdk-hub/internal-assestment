import { describe, expect, it } from "vitest";
import { makeSeed } from "@/lib/iams-data";
import { seedSchemes } from "@/mocks/scheme-seed";
import { checkSchemeAccess, nextSchemeCode, validateScheme } from "./scheme-rules";

const data = makeSeed();
const theory = seedSchemes().find((s) => s.id === "sv2")!;
const lab = seedSchemes().find((s) => s.id === "sv3")!;

describe("validateScheme", () => {
  it("accepts seeded schemes", () => seedSchemes().forEach((s) => expect(validateScheme(s, data)).toEqual({})));
  it("requires total 100 when rule set", () => {
    const s = { ...theory, components: theory.components.map((c, i) => (i === 0 ? { ...c, weightage: 10 } : c)) };
    expect(validateScheme(s, data)["weightage"]).toMatch(/total 100/);
  });
  it("skips total when NO_TOTAL", () => {
    const s = { ...theory, weightageRule: "NO_TOTAL" as const, components: theory.components.map((c, i) => (i === 0 ? { ...c, weightage: 10 } : c)) };
    expect(validateScheme(s, data)["weightage"]).toBeUndefined();
  });
  it("pass marks above max rejected", () => {
    const s = { ...theory, components: theory.components.map((c, i) => (i === 0 ? { ...c, passMarks: 50 } : c)) };
    expect(validateScheme(s, data)["c.0.passMarks"]).toBeDefined();
  });
  it("duplicate code and order rejected", () => {
    const s = { ...theory, components: theory.components.map((c, i) => (i === 1 ? { ...c, code: "ct1", sequence: 1 } : c)) };
    const e = validateScheme(s, data);
    expect(e["c.1.code"]).toMatch(/Duplicate/); expect(e["c.1.sequence"]).toMatch(/used/);
  });
  it("practical max marks configurable", () => {
    const s = { ...lab, components: lab.components.map((c) => (c.code === "PEX" ? { ...c, maxMarks: 25, passMarks: 10 } : c)) };
    expect(validateScheme(s, data)).toEqual({});
  });
  it("theory scheme rejects practical component", () => {
    const s = { ...theory, components: theory.components.map((c, i) => (i === 0 ? { ...c, type: "PRACTICAL" as const } : c)) };
    expect(validateScheme(s, data)["c.0.type"]).toBeDefined();
  });
  it("mixed needs both types", () => {
    const s = { ...theory, type: "MIXED" as const };
    expect(validateScheme(s, data)["components"]).toMatch(/mixed/);
  });
  it("program must match department", () => expect(validateScheme({ ...theory, programId: "p3" }, data)["programId"]).toBeDefined());
});

describe("scheme access", () => {
  it("HOD blocked outside department", () => expect(checkSchemeAccess("HOD", { departmentId: "d2" })).toMatch(/outside/));
  it("faculty blocked", () => expect(checkSchemeAccess("FACULTY", { departmentId: "d1" })).toMatch(/cannot/));
  it("next code", () => expect(nextSchemeCode(seedSchemes())).toBe("SCH005"));
});
