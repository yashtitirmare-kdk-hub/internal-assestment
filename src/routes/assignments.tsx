import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ALL, Field, FilterSelect } from "@/components/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIams } from "@/lib/iams-store";
import { departmentOf, HOD_DEPARTMENT_ID } from "@/lib/iams-data";
import type { FacultyAssignment } from "@/types/people";

export const Route = createFileRoute("/assignments")({
  head: () => ({
    meta: [
      { title: "Faculty Assignments — IAMS" },
      { name: "description", content: "Assign faculty to subjects, classes and sections for each academic session." },
      { property: "og:title", content: "Faculty Assignments — IAMS" },
      { property: "og:description", content: "Faculty → Class → Subject → Sections → Academic Session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const { role, data, faculty, assignments, removeAssignment, myFacultyId } = useIams();
  const canManage = role === "ADMIN" || role === "HOD";
  const [q, setQ] = useState("");
  const [cls, setCls] = useState(ALL);
  const [ses, setSes] = useState(ALL);
  const [editing, setEditing] = useState<FacultyAssignment | "new" | null>(null);
  const [deleting, setDeleting] = useState<FacultyAssignment | null>(null);

  const name = (k: "class" | "subject" | "section" | "session", id: string) => data[k].find((r) => r.id === id);
  const fac = (id: string) => faculty.find((f) => f.id === id);

  const visible = useMemo(() => assignments.filter((a) => {
    if (myFacultyId) return a.facultyId === myFacultyId;
    if (role === "HOD") { const c = data.class.find((x) => x.id === a.classId); return !!c && departmentOf("class", c, data) === HOD_DEPARTMENT_ID; }
    return true;
  }), [assignments, myFacultyId, role, data]);

  const rows = visible.filter((a) => {
    const s = q.trim().toLowerCase();
    const text = `${fac(a.facultyId)?.name ?? ""} ${fac(a.facultyId)?.code ?? ""} ${name("subject", a.subjectId)?.code ?? ""} ${name("subject", a.subjectId)?.name ?? ""}`.toLowerCase();
    return (!s || text.includes(s)) && (cls === ALL || a.classId === cls) && (ses === ALL || a.sessionId === ses);
  });

  const classOpts = (role === "HOD" ? data.class.filter((c) => departmentOf("class", c, data) === HOD_DEPARTMENT_ID) : data.class)
    .map((c) => ({ value: c.id, label: c.name }));

  return (
    <>
      <PageHeader
        title={role === "FACULTY" ? "My Assignments" : "Faculty Assignments"}
        description={canManage ? "Which faculty teaches which subject, to which sections, in which session." : "Subjects and sections you teach."}
        actions={canManage ? <Button onClick={() => setEditing("new")}><Plus /> New Faculty Assignment</Button> : undefined}
      />
      <div className="rounded-lg border bg-card shadow-card">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="h-9 pl-8" placeholder="Search faculty or subject" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <FilterSelect value={cls} onChange={setCls} placeholder="All classes" options={classOpts} />
          <FilterSelect value={ses} onChange={setSes} placeholder="All sessions" options={data.session.map((s) => ({ value: s.id, label: s.name }))} />
        </div>
        {rows.length === 0 ? <EmptyState text="No faculty assignments yet." /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead>
                <TableHead>Sections</TableHead><TableHead>Academic Session</TableHead>
                {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => {
                const f = fac(a.facultyId); const sub = name("subject", a.subjectId);
                return (
                  <TableRow key={a.id}>
                    <TableCell><div className="font-medium">{f?.name}</div><div className="font-mono text-xs text-muted-foreground">{f?.code}</div></TableCell>
                    <TableCell>{name("class", a.classId)?.name}</TableCell>
                    <TableCell><div>{sub?.name}</div><div className="font-mono text-xs text-muted-foreground">{sub?.code}</div></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{a.sectionIds.map((s) => <Badge key={s} variant="secondary">{name("section", s)?.name}</Badge>)}</div></TableCell>
                    <TableCell>{name("session", a.sessionId)?.name}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(a)}><Pencil /></Button>
                        <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDeleting(a)}><Trash2 /></Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {editing && <AssignmentDialog initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this faculty assignment?</AlertDialogTitle>
            <AlertDialogDescription>{deleting && `${fac(deleting.facultyId)?.name} will no longer teach ${name("subject", deleting.subjectId)?.name}.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleting) { removeAssignment(deleting.id); toast.success("Faculty assignment removed"); } setDeleting(null); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Pick({ value, onChange, placeholder, options, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[]; disabled?: boolean | undefined;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={!!disabled}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function AssignmentDialog({ initial, onClose }: { initial: FacultyAssignment | null; onClose: () => void }) {
  const { role, data, faculty, assignments, saveAssignment } = useIams();
  const [a, setA] = useState<FacultyAssignment>(initial ?? {
    id: `fa-${Date.now()}`, facultyId: "", classId: "", subjectId: "", sectionIds: [],
    sessionId: data.session.find((s) => s.status === "ACTIVE")?.id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const inScope = (deptId: string | undefined) => role === "ADMIN" || deptId === HOD_DEPARTMENT_ID;

  const facOpts = faculty.filter((f) => f.status === "ACTIVE" && f.role !== "ADMIN" && inScope(f.departmentId))
    .map((f) => ({ value: f.id, label: `${f.code} - ${f.name}` }));
  const chosen = faculty.find((f) => f.id === a.facultyId);
  const classOpts = data.class.filter((c) => c.status === "ACTIVE" && (!chosen || departmentOf("class", c, data) === chosen.departmentId))
    .map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }));
  const cls = data.class.find((c) => c.id === a.classId);
  const subOpts = data.subject.filter((s) => s.status === "ACTIVE" && cls && s.programId === cls.programId)
    .map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }));
  const sections = data.section.filter((s) => s.classId === a.classId && s.status === "ACTIVE");
  const takenBy = (secId: string) => {
    const o = assignments.find((x) => x.id !== a.id && x.subjectId === a.subjectId && x.sessionId === a.sessionId && x.sectionIds.includes(secId));
    return o ? faculty.find((f) => f.id === o.facultyId)?.name : undefined;
  };

  const save = () => {
    const err = saveAssignment(a);
    if (err) { setError(err); return; }
    toast.success(initial ? "Faculty assignment updated" : "Faculty assignment created");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Faculty Assignment" : "New Faculty Assignment"}</DialogTitle>
          <DialogDescription>Choose who teaches which subject to which sections.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Faculty"><Pick value={a.facultyId} placeholder="Select faculty" options={facOpts}
            onChange={(v) => { setError(null); setA({ ...a, facultyId: v, classId: "", subjectId: "", sectionIds: [] }); }} /></Field>
          <Field label="Class"><Pick value={a.classId} placeholder={chosen ? "Select class" : "Select faculty first"} options={classOpts} disabled={!chosen}
            onChange={(v) => { setError(null); setA({ ...a, classId: v, subjectId: "", sectionIds: [] }); }} /></Field>
          <Field label="Subject">
            {cls && subOpts.length === 0 ? <p className="text-sm text-muted-foreground">No active subjects for this class's program.</p> :
              <Pick value={a.subjectId} placeholder={cls ? "Select subject" : "Select class first"} options={subOpts} disabled={!cls}
                onChange={(v) => { setError(null); setA({ ...a, subjectId: v, sectionIds: a.sectionIds.filter(() => true) }); }} />}
          </Field>
          <Field label="Sections">
            {!cls ? <p className="text-sm text-muted-foreground">Select class first.</p> : sections.length === 0 ?
              <p className="text-sm text-muted-foreground">This class has no active sections.</p> : (
              <div className="grid gap-2 rounded-md border p-3">
                {sections.map((s) => {
                  const owner = a.subjectId ? takenBy(s.id) : undefined;
                  const checked = a.sectionIds.includes(s.id);
                  return (
                    <label key={s.id} className={`flex items-center gap-2 text-sm ${owner ? "opacity-50" : ""}`}>
                      <Checkbox checked={checked} disabled={!!owner}
                        onCheckedChange={(c) => { setError(null); setA({ ...a, sectionIds: c ? [...a.sectionIds, s.id] : a.sectionIds.filter((x) => x !== s.id) }); }} />
                      {s.name}{owner && <span className="text-xs text-muted-foreground">— taught by {owner}</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </Field>
          <Field label="Academic Session"><Pick value={a.sessionId} placeholder="Select academic session"
            options={data.session.filter((s) => s.status === "ACTIVE").map((s) => ({ value: s.id, label: `${s.code} - ${s.name}` }))}
            onChange={(v) => { setError(null); setA({ ...a, sessionId: v }); }} /></Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
