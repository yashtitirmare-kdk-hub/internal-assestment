import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MailCheck, MailWarning, Pencil, Plus, Power, Search, X } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALL, Field, FilterSelect } from "@/components/form-bits";
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
import { HOD_DEPARTMENT_ID, nextCode, ROLE_LABEL, type Role, type Row } from "@/lib/iams-data";
import type { Faculty } from "@/types/people";

export const Route = createFileRoute("/faculty")({
  head: () => ({
    meta: [
      { title: "Faculty — IAMS" },
      { name: "description", content: "Manage faculty accounts, roles and section-wise class incharge duties." },
      { property: "og:title", content: "Faculty — IAMS" },
      { property: "og:description", content: "Faculty accounts and section-wise class incharge management." },
    ],
  }),
  component: FacultyPage,
});

const ROLES: Role[] = ["FACULTY", "CLASS_INCHARGE", "HOD", "ADMIN"];

function FacultyPage() {
  const { role, faculty, incharge, data, saveFaculty } = useIams();
  const isAdmin = role === "ADMIN";
  const canManage = role === "ADMIN" || role === "HOD";
  const [q, setQ] = useState("");
  const [dept, setDept] = useState(ALL);
  const [roleF, setRoleF] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [editing, setEditing] = useState<Faculty | "new" | null>(null);
  const [toggling, setToggling] = useState<Faculty | null>(null);

  const visible = useMemo(() => faculty.filter((f) => isAdmin || f.departmentId === HOD_DEPARTMENT_ID), [faculty, isAdmin]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return visible.filter((f) =>
      (!s || `${f.code} ${f.name} ${f.email} ${f.employeeCode ?? ""}`.toLowerCase().includes(s)) &&
      (dept === ALL || f.departmentId === dept) &&
      (roleF === ALL || f.role === roleF) &&
      (statusF === ALL || f.status === statusF));
  }, [visible, q, dept, roleF, statusF]);

  if (!canManage) {
    return <><PageHeader title="Faculty" /><EmptyState text="Faculty are managed by Admin and Head of Department." /></>;
  }

  const deptName = (id: string) => data.department.find((d) => d.id === id)?.name ?? "—";
  const editable = (f: Faculty) => isAdmin || f.role === "FACULTY" || f.role === "CLASS_INCHARGE";

  const requestToggle = (f: Faculty) => {
    if (f.status === "ACTIVE" && incharge.some((a) => a.facultyId === f.id)) {
      toast.error(`${f.name} is class incharge for sections`, { description: "Remove their section assignments before deactivating." });
      return;
    }
    setToggling(f);
  };

  return (
    <>
      <PageHeader
        title="Faculty"
        description={isAdmin ? "Faculty accounts across all departments." : "Faculty accounts in Computer Applications."}
        actions={<Button onClick={() => setEditing("new")}><Plus /> New Faculty</Button>}
      />
      <div className="rounded-lg border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name, email" className="pl-8" />
          </div>
          {isAdmin && (
            <FilterSelect value={dept} onChange={setDept} placeholder="All departments"
              options={data.department.map((d) => ({ value: d.id, label: d.name }))} />
          )}
          <FilterSelect value={roleF} onChange={setRoleF} placeholder="All roles" options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
          <FilterSelect value={statusF} onChange={setStatusF} placeholder="All statuses"
            options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }]} />
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} records</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState text={visible.length ? "No faculty match these filters." : "No faculty yet."} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => {
                  const n = incharge.filter((a) => a.facultyId === f.id).length;
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs font-medium text-primary">{f.code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{f.name}</div>
                        {f.employeeCode && <div className="font-mono text-xs text-muted-foreground">{f.employeeCode}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{deptName(f.departmentId)}</TableCell>
                      <TableCell>
                        <div>{ROLE_LABEL[f.role]}</div>
                        {f.role === "CLASS_INCHARGE" && <div className="text-xs text-muted-foreground">{n} section{n === 1 ? "" : "s"}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          {f.emailVerified
                            ? <MailCheck className="size-4 shrink-0 text-success" aria-label="Verified" />
                            : <MailWarning className="size-4 shrink-0 text-destructive" aria-label="Not verified" />}
                          <span className="truncate">{f.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.status === "ACTIVE" ? "success" : "secondary"}>{f.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button size="icon" variant="ghost" aria-label="Edit" disabled={!editable(f)} onClick={() => setEditing(f)}><Pencil /></Button>
                        <Button size="icon" variant="ghost" aria-label={f.status === "ACTIVE" ? "Deactivate" : "Activate"} disabled={!editable(f)} onClick={() => requestToggle(f)}><Power /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editing && <FacultyDialog row={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <AlertDialog open={!!toggling} onOpenChange={(o) => !o && setToggling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggling?.status === "ACTIVE" ? "Deactivate" : "Activate"} {toggling?.code} - {toggling?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {toggling?.status === "ACTIVE" ? "They will no longer be able to sign in or be given new assignments." : "They will be able to sign in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!toggling) return;
              const status = toggling.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
              const err = saveFaculty({ ...toggling, status });
              if (err) { toast.error(err); return; }
              toast.success(`${toggling.name} ${status === "ACTIVE" ? "activated" : "deactivated"}`);
            }}>
              {toggling?.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function FacultyDialog({ row, onClose }: { row: Faculty | null; onClose: () => void }) {
  const { role, data, faculty, incharge, saveFaculty, sectionDept } = useIams();
  const isAdmin = role === "ADMIN";
  const [f, setF] = useState({
    name: row?.name ?? "", email: row?.email ?? "", employeeCode: row?.employeeCode ?? "",
    departmentId: row?.departmentId ?? (isAdmin ? "" : HOD_DEPARTMENT_ID),
    role: row?.role ?? ("FACULTY" as Role), status: row?.status ?? "ACTIVE",
  });
  const [sections, setSections] = useState<string[]>(() => row ? incharge.filter((a) => a.facultyId === row.id).map((a) => a.sectionId) : []);
  const [error, setError] = useState<string | null>(null);
  const roleOptions: Role[] = isAdmin ? ROLES : ["FACULTY", "CLASS_INCHARGE"];
  const code = row?.code ?? nextCode(faculty as unknown as Row[], "FAC");

  const set = (k: keyof typeof f, v: string) => { setError(null); setF((p) => ({ ...p, [k]: v })); };

  const deptSections = data.section.filter((s) => sectionDept(s.id) === f.departmentId);
  const byClass = data.class
    .map((c) => ({ c, secs: deptSections.filter((s) => s.classId === c.id) }))
    .filter((g) => g.secs.length);
  const ownerOf = (sid: string) => {
    const a = incharge.find((x) => x.sectionId === sid && x.facultyId !== row?.id);
    return a ? faculty.find((x) => x.id === a.facultyId) : undefined;
  };

  const submit = () => {
    const id = row?.id ?? `f-${Date.now()}`;
    const err = saveFaculty({
      id, code, name: f.name, email: f.email, employeeCode: f.employeeCode || undefined, departmentId: f.departmentId,
      role: f.role, status: f.status as Faculty["status"], emailVerified: row?.emailVerified ?? false,
    }, f.role === "CLASS_INCHARGE" || sections.length ? sections : []);
    if (err) return setError(err);
    toast.success(`Faculty ${row ? "updated" : "created"}`, { description: `${code} - ${f.name.trim()}` });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{row ? "Edit Faculty" : "New Faculty"}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{code}</span>{!row && " will be assigned automatically."}
            {row && !row.emailVerified && " · Email not verified yet."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Employee code (optional)"><Input value={f.employeeCode} onChange={(e) => set("employeeCode", e.target.value)} /></Field>
          <Field label="Department">
            <Select value={f.departmentId} onValueChange={(v) => { set("departmentId", v); setSections([]); }} disabled={!isAdmin}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {data.department.filter((d) => d.status === "ACTIVE" || d.id === f.departmentId).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Role">
            <Select value={f.role} onValueChange={(v) => set("role", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{roleOptions.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={f.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {(f.role === "CLASS_INCHARGE" || sections.length > 0) && (
          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
              <div>
                <div className="text-sm font-medium">Class Incharge sections</div>
                <div className="text-xs text-muted-foreground">Class → Section. One incharge per section.</div>
              </div>
              <span className="text-xs text-muted-foreground">{sections.length} selected</span>
            </div>
            {sections.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-b p-3">
                {sections.map((sid) => {
                  const s = data.section.find((x) => x.id === sid);
                  const c = data.class.find((x) => x.id === s?.classId);
                  return (
                    <Badge key={sid} variant="outline" className="gap-1 font-normal">
                      {c?.name} → {s?.name}
                      <button type="button" aria-label="Remove section" onClick={() => setSections((l) => l.filter((x) => x !== sid))}><X className="size-3" /></button>
                    </Badge>
                  );
                })}
              </div>
            )}
            {!f.departmentId ? (
              <p className="p-3 text-sm text-muted-foreground">Select a department first.</p>
            ) : byClass.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No sections exist in this department.</p>
            ) : f.role !== "CLASS_INCHARGE" ? (
              <p className="p-3 text-sm text-destructive">This faculty is no longer Class Incharge. Remove the sections above to save.</p>
            ) : (
              <div className="grid gap-3 p-3 sm:grid-cols-2">
                {byClass.map(({ c, secs }) => (
                  <div key={c.id}>
                    <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.name}</div>
                    {secs.map((s) => {
                      const owner = ownerOf(s.id);
                      const checked = sections.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
                          <Checkbox checked={checked} disabled={!!owner}
                            onCheckedChange={(v) => setSections((l) => v ? [...l, s.id] : l.filter((x) => x !== s.id))} />
                          <span className={owner ? "text-muted-foreground" : undefined}>{s.name}</span>
                          {owner && <span className="text-xs text-muted-foreground">· {owner.code} {owner.name}</span>}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{row ? "Save changes" : "Create Faculty"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

