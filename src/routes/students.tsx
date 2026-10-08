import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, FileSpreadsheet, Pencil, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ALL, Field, FilterSelect } from "@/components/form-bits";
import { ExcelImportDialog } from "@/components/excel-import";
import { validateStudentImport } from "@/services/people-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIams } from "@/lib/iams-store";
import { nextCode, type Row } from "@/lib/iams-data";
import type { ImportColumn } from "@/services/excel";
import type { Student } from "@/types/people";

export const Route = createFileRoute("/students")({
  head: () => ({
    meta: [
      { title: "Students — IAMS" },
      { name: "description", content: "Student records organised by department, program, class and section." },
      { property: "og:title", content: "Students — IAMS" },
      { property: "og:description", content: "Manage student records and bulk Excel imports." },
    ],
  }),
  component: StudentsPage,
});

const COLUMNS: ImportColumn[] = [
  { key: "rollNo", header: "Roll No", required: true, example: "101" },
  { key: "enrollmentNo", header: "Enrollment No", required: true, example: "EN20260101" },
  { key: "name", header: "Student Name", required: true, example: "Aarav Shah" },
  { key: "department", header: "Department Code", required: true, example: "DEP001" },
  { key: "program", header: "Program Code", required: true, example: "PROG001" },
  { key: "class", header: "Class Code", required: true, example: "CLS001" },
  { key: "section", header: "Section Code", required: true, example: "SEC001" },
  { key: "session", header: "Session", required: true, example: "2026-2027" },
  { key: "semester", header: "Semester No", required: true, example: "1" },
  { key: "gender", header: "Gender", example: "MALE" },
  { key: "email", header: "Email", example: "aarav@student.edu.in" },
  { key: "phone", header: "Phone", example: "9876543210" },
];

function StudentsPage() {
  const { role, data, students, saveStudents, sectionDept, visibleSectionIds } = useIams();
  const canManage = role === "ADMIN" || role === "HOD";
  const [q, setQ] = useState("");
  const [f, setF] = useState({ dept: ALL, prog: ALL, cls: ALL, sec: ALL, ses: ALL });
  const [editing, setEditing] = useState<Student | "new" | null>(null);
  const [viewing, setViewing] = useState<Student | null>(null);
  const [importing, setImporting] = useState(false);

  const allowedSections = useMemo(() => data.section.filter((s) => visibleSectionIds.includes(s.id)), [data, visibleSectionIds]);
  const allowedIds = new Set(allowedSections.map((s) => s.id));

  const sec = (id: string) => data.section.find((s) => s.id === id);
  const cls = (id?: unknown) => data.class.find((c) => c.id === id);
  const prog = (id?: unknown) => data.program.find((p) => p.id === id);
  const path = (sid: string) => { const s = sec(sid); const c = cls(s?.classId); const p = prog(c?.programId); return { s, c, p }; };

  const depts = data.department.filter((d) => allowedSections.some((s) => sectionDept(s.id) === d.id));
  const progs = data.program.filter((p) => (f.dept === ALL || p.departmentId === f.dept) && allowedSections.some((s) => cls(s.classId)?.programId === p.id));
  const classes = data.class.filter((c) => (f.prog === ALL ? progs.some((p) => p.id === c.programId) : c.programId === f.prog) && allowedSections.some((s) => s.classId === c.id));
  const sections = allowedSections.filter((s) => classes.some((c) => c.id === s.classId) && (f.cls === ALL || s.classId === f.cls));

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return students.filter((st) => {
      if (!allowedIds.has(st.sectionId)) return false;
      const { c, p } = path(st.sectionId);
      return (!s || `${st.code} ${st.name} ${st.rollNo} ${st.enrollmentNo}`.toLowerCase().includes(s)) &&
        (f.dept === ALL || p?.departmentId === f.dept) && (f.prog === ALL || p?.id === f.prog) &&
        (f.cls === ALL || c?.id === f.cls) && (f.sec === ALL || st.sectionId === f.sec) && (f.ses === ALL || st.sessionId === f.ses);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, q, f, allowedSections, data]);

  if (role === "FACULTY") {
    return <><PageHeader title="My Students" /><EmptyState text="My Students will list students from your subject assignments once Faculty Assignments is built. Not available yet." /></>;
  }

  const validate = (raw: Record<string, string>[]) => validateStudentImport(raw, {
    students, allowedSectionIds: visibleSectionIds, data, role,
    required: COLUMNS.filter((c) => c.required).map((c) => c.key),
    headers: Object.fromEntries(COLUMNS.map((c) => [c.key, c.header])),
  });

  const setFilter = (k: keyof typeof f, v: string) => setF((p) => {
    const n = { ...p, [k]: v };
    const order: (keyof typeof f)[] = ["dept", "prog", "cls", "sec"];
    const idx = order.indexOf(k);
    if (idx >= 0) order.slice(idx + 1).forEach((o) => (n[o] = ALL));
    return n;
  });

  return (
    <>
      <PageHeader
        title="Students"
        description={role === "ADMIN" ? "Students across all departments." : role === "HOD" ? "Students in Computer Applications." : "Students in the sections you are class incharge for (read-only)."}
        actions={canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImporting(true)}><FileSpreadsheet /> Bulk import</Button>
            <Button onClick={() => setEditing("new")}><Plus /> New Student</Button>
          </div>
        )}
      />
      <div className="rounded-lg border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name, roll, enrollment" className="pl-8" />
          </div>
          {role === "ADMIN" && <FilterSelect value={f.dept} onChange={(v) => setFilter("dept", v)} placeholder="All departments" options={depts.map((d) => ({ value: d.id, label: d.name }))} />}
          <FilterSelect value={f.prog} onChange={(v) => setFilter("prog", v)} placeholder="All programs" options={progs.map((p) => ({ value: p.id, label: p.name }))} />
          <FilterSelect value={f.cls} onChange={(v) => setFilter("cls", v)} placeholder="All classes" options={classes.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect value={f.sec} onChange={(v) => setFilter("sec", v)} placeholder="All sections" options={sections.map((s) => ({ value: s.id, label: s.name }))} />
          <FilterSelect value={f.ses} onChange={(v) => setFilter("ses", v)} placeholder="All sessions" options={data.session.map((s) => ({ value: s.id, label: s.name }))} />
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} records</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState text={allowedSections.length ? "No students match these filters." : "You have no sections assigned."} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead className="w-20">Roll</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Program · Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((st) => {
                  const { s, c, p } = path(st.sectionId);
                  return (
                    <TableRow key={st.id}>
                      <TableCell className="font-mono text-xs font-medium text-primary">{st.code}</TableCell>
                      <TableCell className="font-mono text-xs">{st.rollNo}</TableCell>
                      <TableCell>
                        <div className="font-medium">{st.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{st.enrollmentNo}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p?.name} · {c?.name}</TableCell>
                      <TableCell>{s?.name}</TableCell>
                      <TableCell className="text-muted-foreground">{data.session.find((x) => x.id === st.sessionId)?.name}</TableCell>
                      <TableCell><Badge variant={st.status === "ACTIVE" ? "success" : "secondary"}>{st.status === "ACTIVE" ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button size="icon" variant="ghost" aria-label="View" onClick={() => setViewing(st)}><Eye /></Button>
                        {canManage && <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(st)}><Pencil /></Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editing && <StudentDialog row={editing === "new" ? null : editing} sections={allowedSections} onClose={() => setEditing(null)} />}
      {importing && (
        <ExcelImportDialog title="Bulk import students" templateName="students-template.xlsx" columns={COLUMNS} validate={validate}
          onClose={() => setImporting(false)}
          onConfirm={(v) => {
            const err = saveStudents(v);
            if (err) { toast.error("Import cancelled — nothing was added", { description: err }); return; }
            toast.success(`${v.length} students imported`); setImporting(false);
          }} />
      )}
      {viewing && (() => {
        const { s, c, p } = path(viewing.sectionId);
        const dept = data.department.find((d) => d.id === p?.departmentId);
        const items: [string, string | undefined][] = [
          ["Student code", viewing.code], ["Roll no", viewing.rollNo], ["Enrollment no", viewing.enrollmentNo],
          ["Gender", viewing.gender], ["Email", viewing.email], ["Phone", viewing.phone],
          ["Department", dept?.name], ["Program", p?.name], ["Class", c?.name], ["Section", s?.name],
          ["Session", data.session.find((x) => x.id === viewing.sessionId)?.name], ["Semester", data.semester.find((x) => x.id === viewing.semesterId)?.name],
          ["Status", viewing.status === "ACTIVE" ? "Active" : "Inactive"],
        ];
        return (
          <Dialog open onOpenChange={(o) => !o && setViewing(null)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>{viewing.name}</DialogTitle><DialogDescription className="font-mono">{viewing.code}</DialogDescription></DialogHeader>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {items.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd>{v || "—"}</dd></div>)}
              </dl>
            </DialogContent>
          </Dialog>
        );
      })()}
    </>
  );
}

function StudentDialog({ row, sections, onClose }: { row: Student | null; sections: Row[]; onClose: () => void }) {
  const { data, students, saveStudents } = useIams();
  const [f, setF] = useState({
    name: row?.name ?? "", rollNo: row?.rollNo ?? "", enrollmentNo: row?.enrollmentNo ?? "", email: row?.email ?? "", phone: row?.phone ?? "",
    gender: row?.gender ?? "", sectionId: row?.sectionId ?? "", sessionId: row?.sessionId ?? (data.session.find((s) => s.status === "ACTIVE")?.id ?? ""),
    semesterId: row?.semesterId ?? "", status: row?.status ?? "ACTIVE",
  });
  const [error, setError] = useState<string | null>(null);
  const code = row?.code ?? nextCode(students as unknown as Row[], "STU");
  const set = (k: keyof typeof f, v: string) => { setError(null); setF((p) => ({ ...p, [k]: v })); };
  const label = (s: Row) => `${data.class.find((c) => c.id === s.classId)?.name} → ${s.name}`;

  const submit = () => {
    const err = saveStudents([{
      id: row?.id ?? `st-${Date.now()}`, code, name: f.name.trim(), rollNo: f.rollNo.trim(), enrollmentNo: f.enrollmentNo.trim().toUpperCase(),
      email: f.email.trim() || undefined, phone: f.phone.trim() || undefined, gender: (f.gender || undefined) as Student["gender"],
      sectionId: f.sectionId, sessionId: f.sessionId, semesterId: f.semesterId, status: f.status as Student["status"],
    }]);
    if (err) return setError(err.replace(/^[^:]*: /, ""));
    toast.success(`Student ${row ? "updated" : "created"}`, { description: `${code} - ${f.name.trim()}` });
    onClose();
  };

  const sel = (k: keyof typeof f, placeholder: string, opts: { value: string; label: string }[]) => (
    <Select value={f[k]} onValueChange={(v) => set(k, v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{row ? "Edit Student" : "New Student"}</DialogTitle>
          <DialogDescription><span className="font-mono">{code}</span>{!row && " will be assigned automatically."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Enrollment no"><Input value={f.enrollmentNo} onChange={(e) => set("enrollmentNo", e.target.value)} /></Field>
          <Field label="Section">{sel("sectionId", "Select class → section", sections.filter((s) => s.status === "ACTIVE" || s.id === f.sectionId).map((s) => ({ value: s.id, label: label(s) })))}</Field>
          <Field label="Roll no"><Input value={f.rollNo} onChange={(e) => set("rollNo", e.target.value)} /></Field>
          <Field label="Academic session">{sel("sessionId", "Select session", data.session.map((s) => ({ value: s.id, label: s.name })))}</Field>
          <Field label="Semester">{sel("semesterId", "Select semester", data.semester.map((s) => ({ value: s.id, label: s.name })))}</Field>
          <Field label="Gender">{sel("gender", "Select gender", [{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }, { value: "OTHER", label: "Other" }])}</Field>
          <Field label="Status">{sel("status", "Status", [{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }])}</Field>
          <Field label="Email (optional)"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Phone (optional)"><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        </div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{row ? "Save changes" : "Create Student"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
