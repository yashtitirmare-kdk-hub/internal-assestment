import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, Inbox } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIams } from "@/lib/iams-store";
import {
  ADMIN_KINDS, departmentOf, ENTITY_META, HOD_DEPARTMENT_ID, HOD_KINDS, nextCode,
  type EntityKind, type MasterData, type Row,
} from "@/lib/iams-data";

export const Route = createFileRoute("/master-data")({
  head: () => ({
    meta: [
      { title: "Master Data — IAMS" },
      { name: "description", content: "Manage colleges, departments, programs, classes, sections and subjects." },
      { property: "og:title", content: "Master Data — IAMS" },
      { property: "og:description", content: "Structured academic master data for internal assessments." },
    ],
  }),
  component: MasterDataPage,
});

type Form = Record<string, string> & { status: string; departmentId: string; programId: string; code: string };

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: (form: Form, d: MasterData, scoped: (k: EntityKind) => Row[]) => { value: string; label: string }[];
  emptyText?: string;
  resets?: string[];
  virtual?: boolean;
};

const opt = (rows: Row[]) => rows.map((r) => ({ value: r.id, label: `${r.code} - ${r.name}` }));

const FIELDS: Record<EntityKind, Field[]> = {
  college: [{ key: "name", label: "College Name", type: "text" }, { key: "city", label: "City", type: "text" }],
  department: [
    { key: "collegeId", label: "College", type: "select", options: (_f, d) => opt(d.college) },
    { key: "name", label: "Department Name", type: "text" },
  ],
  session: [{ key: "name", label: "Session (e.g. 2026-2027)", type: "text" }],
  semester: [
    { key: "name", label: "Semester Name", type: "text" },
    { key: "number", label: "Number", type: "number" },
  ],
  program: [
    { key: "departmentId", label: "Department", type: "select", options: (_f, _d, s) => opt(s("department")) },
    { key: "name", label: "Program Name", type: "text" },
    { key: "duration", label: "Duration (years)", type: "number" },
  ],
  class: [
    { key: "programId", label: "Program", type: "select", options: (_f, _d, s) => opt(s("program")) },
    { key: "name", label: "Class Name", type: "text" },
    { key: "year", label: "Year", type: "number" },
  ],
  section: [
    { key: "classId", label: "Class", type: "select", options: (_f, _d, s) => opt(s("class")) },
    { key: "name", label: "Section Name", type: "text" },
  ],
  subject: [
    { key: "departmentId", label: "Department", type: "select", virtual: true, resets: ["programId"],
      options: (_f, _d, s) => opt(s("department")) },
    { key: "programId", label: "Program", type: "select", emptyText: "No programs in this department.",
      options: (f, _d, s) => (f.departmentId ? opt(s("program").filter((p) => p.departmentId === f.departmentId)) : []) },
    { key: "code", label: "Subject Code", type: "text" },
    { key: "name", label: "Subject Name", type: "text" },
    { key: "courseType", label: "Course Type", type: "select",
      options: () => [{ value: "THEORY", label: "Theory" }, { value: "PRACTICAL", label: "Practical" }] },
  ],
};

function details(kind: EntityKind, r: Row, d: MasterData): string {
  const n = (k: EntityKind, id: unknown) => d[k].find((x) => x.id === id)?.name ?? "—";
  switch (kind) {
    case "college": return String(r.city);
    case "department": return n("college", r.collegeId);
    case "session": return "Global configuration";
    case "semester": return `Semester #${r.number}`;
    case "program": return `${n("department", r.departmentId)} · ${r.duration} yrs`;
    case "class": return `${n("program", r.programId)} · Year ${r.year}`;
    case "section": return n("class", r.classId);
    case "subject": return `${n("program", r.programId)} · ${r.courseType === "THEORY" ? "Theory" : "Practical"}`;
  }
}

function MasterDataPage() {
  const { role, data, scoped, upsert, remove } = useIams();
  const kinds = role === "ADMIN" ? ADMIN_KINDS : role === "HOD" ? HOD_KINDS : [];
  const [kind, setKind] = useState<EntityKind>(kinds[0] ?? "program");
  const active = kinds.includes(kind) ? kind : kinds[0];
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const rows = useMemo(() => {
    if (!active) return [];
    const s = q.trim().toLowerCase();
    return scoped(active).filter((r) => !s || `${r.code} ${r.name}`.toLowerCase().includes(s));
  }, [active, q, scoped]);

  if (!active) {
    return (
      <>
        <PageHeader title="Master Data" />
        <EmptyState text="Master Data is managed by Admin and HOD." />
      </>
    );
  }
  const meta = ENTITY_META[active];

  const canDelete = (r: Row) => {
    const children: Partial<Record<EntityKind, [EntityKind, string]>> = {
      college: ["department", "collegeId"], department: ["program", "departmentId"],
      program: ["class", "programId"], class: ["section", "classId"],
    };
    const c = children[active];
    return !c || !data[c[0]].some((x) => x[c[1]] === r.id);
  };

  return (
    <>
      <PageHeader
        title="Master Data"
        description={role === "HOD" ? "Programs, classes, sections and subjects in Computer Applications." : "Academic structure across the institution."}
        actions={<Button onClick={() => setEditing("new")}><Plus /> New {meta.label}</Button>}
      />
      <Tabs value={active} onValueChange={(v) => { setKind(v as EntityKind); setQ(""); }}>
        <TabsList className="mb-4 h-auto flex-wrap">
          {kinds.map((k) => (
            <TabsTrigger key={k} value={k}>
              {ENTITY_META[k].plural}
              <span className="ml-1.5 rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{scoped(k).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-lg border bg-card shadow-card">
        <div className="flex items-center gap-2 border-b p-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${meta.plural.toLowerCase()} by code or name`} className="pl-8" />
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} records</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState text={q ? "No records match your search." : `No ${meta.plural.toLowerCase()} yet.`} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-medium text-primary">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{details(active, r, data)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "ACTIVE" ? "success" : "secondary"}>{r.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(r)}><Pencil /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => {
                      if (!canDelete(r)) return toast.error(`${r.name} has linked records`, { description: "Remove or reassign them first, or mark this inactive." });
                      setDeleting(r);
                    }}><Trash2 /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {editing && (
        <EntityDialog
          kind={active}
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(row) => {
            upsert(active, row);
            toast.success(`${meta.label} ${editing === "new" ? "created" : "updated"}`, { description: `${row.code} - ${row.name}` });
            setEditing(null);
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.code} - {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleting) { remove(active, deleting.id); toast.success(`${meta.label} deleted`); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
      <Inbox className="size-8 opacity-50" />
      {text}
    </div>
  );
}

function EntityDialog({ kind, row, onClose, onSave }: {
  kind: EntityKind; row: Row | null; onClose: () => void; onSave: (r: Row) => void;
}) {
  const { data, scoped } = useIams();
  const meta = ENTITY_META[kind];
  const fields = FIELDS[kind];
  const [form, setForm] = useState<Form>(() => {
    const init = { status: row?.status ?? "ACTIVE", departmentId: "", programId: "", code: "" } as Form;
    for (const f of fields) init[f.key] = row?.[f.key] !== undefined ? String(row[f.key]) : "";
    if (kind === "subject" && row) init.departmentId = departmentOf("subject", row, data) ?? "";
    if (!row && fields.some((f) => f.key === "departmentId") && scoped("department").length === 1) {
      init.departmentId = HOD_DEPARTMENT_ID;
    }
    return init;
  });
  const [error, setError] = useState<string | null>(null);

  const set = (f: Field, v: string) => {
    setError(null);
    setForm((p) => {
      const n = { ...p, [f.key]: v };
      f.resets?.forEach((k) => (n[k] = ""));
      return n;
    });
  };

  const submit = () => {
    const missing = fields.find((f) => !(form[f.key] ?? "")?.trim());
    if (missing) return setError(`${missing.label} is required.`);
    if (kind === "subject") {
      const code = form.code.trim().toUpperCase();
      const dup = data.subject.find((s) => s.id !== row?.id && s.programId === form.programId && s.code.toUpperCase() === code);
      if (dup) {
        const p = data.program.find((x) => x.id === form.programId)?.name;
        return setError(`Subject code ${code} already exists in ${p} ("${dup.name}"). Codes must be unique within a program.`);
      }
    }
    const out: Row = { ...(row ?? {}), id: row?.id ?? `${kind}-${Date.now()}`, code: row?.code ?? nextCode(data[kind], meta.prefix), name: "", status: form.status as Row["status"] };
    for (const f of fields) {
      if (f.virtual) continue;
      out[f.key] = f.type === "number" ? Number((form[f.key] ?? "")) : f.key === "code" ? (form[f.key] ?? "").trim().toUpperCase() : (form[f.key] ?? "").trim();
    }
    onSave(out);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{row ? `Edit ${meta.label}` : `New ${meta.label}`}</DialogTitle>
          <DialogDescription>
            {row ? <span className="font-mono">{row.code}</span> : kind === "subject" ? "Subject codes are unique within a program." : `Code will be assigned automatically (${nextCode(data[kind], meta.prefix)}).`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {fields.map((f) => {
            if (f.type !== "select") {
              return (
                <div key={f.key} className="grid gap-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input id={f.key} type={f.type} value={(form[f.key] ?? "")} onChange={(e) => set(f, e.target.value)} />
                </div>
              );
            }
            const options = f.options!(form, data, scoped);
            const parentMissing = f.key === "programId" && kind === "subject" && !form.departmentId;
            return (
              <div key={f.key} className="grid gap-1.5">
                <Label>{f.label}</Label>
                <Select value={(form[f.key] ?? "")} onValueChange={(v) => set(f, v)} disabled={parentMissing || options.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={parentMissing ? "Select a department first" : options.length === 0 ? (f.emptyText ?? "No options available") : `Select ${f.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!parentMissing && options.length === 0 && <p className="text-xs text-muted-foreground">{f.emptyText ?? "No options available."}</p>}
              </div>
            );
          })}
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{row ? "Save changes" : `Create ${meta.label}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
