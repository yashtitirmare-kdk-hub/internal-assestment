import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
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
import { HOD_DEPARTMENT_ID } from "@/lib/iams-data";
import { activeWeightage, canManageSchemes, inSchemeScope, validateScheme, type SchemeErrors } from "@/services/scheme-rules";
import type { ComponentType, SchemeComponent, SchemeStatus, SchemeType, SchemeVersion, WeightageRule } from "@/types/scheme";

export const Route = createFileRoute("/schemes")({
  head: () => ({
    meta: [
      { title: "Assessment Schemes — IAMS" },
      { name: "description", content: "Configure internal assessment schemes, components, marks, weightage and versions." },
      { property: "og:title", content: "Assessment Schemes — IAMS" },
      { property: "og:description", content: "Theory, practical and mixed schemes with versioned, configurable components." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchemesPage,
});

const TYPE_LABEL: Record<SchemeType, string> = { THEORY: "Theory", PRACTICAL: "Practical", MIXED: "Mixed" };
const STATUS_VARIANT: Record<SchemeStatus, "default" | "secondary" | "outline"> = { ACTIVE: "default", DRAFT: "outline", INACTIVE: "secondary" };
const STATUS_LABEL: Record<SchemeStatus, string> = { ACTIVE: "Active", DRAFT: "Draft", INACTIVE: "Inactive" };

function SchemesPage() {
  const { role, data, schemes, newSchemeVersion, setSchemeStatus } = useIams();
  const [q, setQ] = useState("");
  const [type, setType] = useState(ALL);
  const [dept, setDept] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [editing, setEditing] = useState<SchemeVersion | "new" | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [toggling, setToggling] = useState<SchemeVersion | null>(null);

  const latest = useMemo(() => {
    const m = new Map<string, SchemeVersion>();
    schemes.filter((s) => inSchemeScope(role, s.departmentId)).forEach((s) => { const p = m.get(s.code); if (!p || s.version > p.version) m.set(s.code, s); });
    return [...m.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [schemes, role]);

  if (!canManageSchemes(role)) {
    return (<><PageHeader title="Assessment Schemes" /><div className="rounded-lg border bg-card shadow-card"><EmptyState text="Assessment schemes are managed by Admin and Head of Department." /></div></>);
  }

  const nm = (k: "department" | "program" | "semester", id?: string) => data[k].find((r) => r.id === id)?.name;
  const versionsOf = (code: string) => schemes.filter((s) => s.code === code);
  const rows = latest.filter((s) => {
    const t = q.trim().toLowerCase();
    return (!t || `${s.code} ${s.name} ${nm("program", s.programId) ?? ""}`.toLowerCase().includes(t))
      && (type === ALL || s.type === type) && (dept === ALL || s.departmentId === dept) && (status === ALL || s.status === status);
  });

  const makeVersion = (s: SchemeVersion) => {
    const r = newSchemeVersion(s.code);
    if (typeof r === "string") { toast.error(r); return; }
    toast.success(`Version ${r.version} created as a draft`);
    setEditing(r);
  };

  return (
    <>
      <PageHeader
        title="Assessment Schemes"
        description="Components, marks and weightage used for internal assessment. Used versions are never rewritten."
        actions={<Button onClick={() => setEditing("new")}><Plus /> New Scheme</Button>}
      />
      <div className="rounded-lg border bg-card shadow-card">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input className="h-9 pl-8" placeholder="Search code, name or program" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <FilterSelect value={type} onChange={setType} placeholder="All types" options={(["THEORY", "PRACTICAL", "MIXED"] as const).map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
          {role === "ADMIN" && <FilterSelect value={dept} onChange={setDept} placeholder="All departments" options={data.department.map((d) => ({ value: d.id, label: d.name }))} />}
          <FilterSelect value={status} onChange={setStatus} placeholder="All statuses" options={(["ACTIVE", "DRAFT", "INACTIVE"] as const).map((t) => ({ value: t, label: STATUS_LABEL[t] }))} />
        </div>
        {rows.length === 0 ? <EmptyState text="No schemes match." /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Applies to</TableHead>
                <TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const vs = versionsOf(s.code);
                const live = vs.find((v) => v.status === "ACTIVE");
                return (
                  <TableRow key={s.code}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{TYPE_LABEL[s.type]}</TableCell>
                    <TableCell><div>{nm("program", s.programId)}{s.semesterId && ` · ${nm("semester", s.semesterId)}`}</div><div className="text-xs text-muted-foreground">{nm("department", s.departmentId)}</div></TableCell>
                    <TableCell><div>Version {s.version}</div><div className="text-xs text-muted-foreground">{vs.length} version{vs.length > 1 ? "s" : ""}{live && live.id !== s.id ? ` · Version ${live.version} in use` : ""}</div></TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" aria-label="View" onClick={() => setViewing(s.code)}><Eye /></Button>
                      {s.status === "DRAFT"
                        ? <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing(s)}><Pencil /></Button>
                        : <Button size="icon" variant="ghost" aria-label="New version" title="Create new version" onClick={() => makeVersion(s)}><Copy /></Button>}
                      <Button size="icon" variant="ghost" aria-label={s.status === "ACTIVE" ? "Deactivate" : "Activate"} title={s.status === "ACTIVE" ? "Deactivate" : "Activate"} onClick={() => setToggling(s)}><Power /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {editing && <SchemeDialog key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {viewing && <DetailsDialog code={viewing} onClose={() => setViewing(null)} onEdit={(v) => { setViewing(null); setEditing(v); }} />}
      <AlertDialog open={!!toggling} onOpenChange={(o) => !o && setToggling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggling?.status === "ACTIVE" ? "Deactivate" : "Activate"} {toggling?.code} Version {toggling?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              {toggling?.status === "ACTIVE" ? "This scheme will no longer be available for new assessments."
                : "This version becomes the one in use. Any other active version of this scheme becomes inactive and is kept for records."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (toggling) {
                const next = toggling.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                const err = setSchemeStatus(toggling.id, next);
                if (err) toast.error(err); else toast.success(next === "ACTIVE" ? "Scheme activated" : "Scheme deactivated");
              }
              setToggling(null);
            }}>{toggling?.status === "ACTIVE" ? "Deactivate" : "Activate"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DetailsDialog({ code, onClose, onEdit }: { code: string; onClose: () => void; onEdit: (v: SchemeVersion) => void }) {
  const { data, schemes } = useIams();
  const versions = schemes.filter((s) => s.code === code).sort((a, b) => b.version - a.version);
  const [vid, setVid] = useState(versions[0]?.id ?? "");
  const v = versions.find((x) => x.id === vid) ?? versions[0];
  if (!v) return null;
  const nm = (k: "department" | "program" | "semester", id?: string) => data[k].find((r) => r.id === id)?.name ?? "—";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{v.code} · {v.name}</DialogTitle>
          <DialogDescription>{nm("department", v.departmentId)} · {nm("program", v.programId)}{v.semesterId ? ` · ${nm("semester", v.semesterId)}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {versions.map((x) => (
            <Button key={x.id} size="sm" variant={x.id === v.id ? "default" : "outline"} onClick={() => setVid(x.id)}>
              Version {x.version} · {STATUS_LABEL[x.status]}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div><div className="text-muted-foreground">Type</div>{TYPE_LABEL[v.type]}</div>
          <div><div className="text-muted-foreground">Status</div><Badge variant={STATUS_VARIANT[v.status]}>{STATUS_LABEL[v.status]}</Badge></div>
          <div><div className="text-muted-foreground">Weightage rule</div>{v.weightageRule === "TOTAL_100" ? "Must total 100%" : "No fixed total"}</div>
          <div><div className="text-muted-foreground">Active weightage</div>{activeWeightage(v)}%</div>
        </div>
        {v.note && <p className="text-sm text-muted-foreground">{v.note}</p>}
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Component</TableHead><TableHead>Type</TableHead><TableHead>Max</TableHead><TableHead>Pass</TableHead><TableHead>Weight</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...v.components].sort((a, b) => a.sequence - b.sequence).map((c) => (
                <TableRow key={c.id} className={c.active ? "" : "opacity-50"}>
                  <TableCell>{c.sequence}</TableCell>
                  <TableCell><div>{c.name}</div><div className="font-mono text-xs text-muted-foreground">{c.code}</div></TableCell>
                  <TableCell>{TYPE_LABEL[c.type]}</TableCell><TableCell>{c.maxMarks}</TableCell><TableCell>{c.passMarks ?? "—"}</TableCell>
                  <TableCell>{c.weightage}%</TableCell><TableCell>{c.active ? "Active" : "Inactive"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          {v.status === "DRAFT" && <Button variant="outline" onClick={() => onEdit(v)}><Pencil /> Edit draft</Button>}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const blankComponent = (seq: number, type: ComponentType): SchemeComponent =>
  ({ id: `c-${Date.now()}-${seq}`, name: "", code: "", type, maxMarks: Number.NaN, weightage: Number.NaN, sequence: seq, active: true });

function SchemeDialog({ initial, onClose }: { initial: SchemeVersion | null; onClose: () => void }) {
  const { role, data, createScheme, updateScheme } = useIams();
  const [s, setS] = useState<SchemeVersion>(initial ?? {
    id: "", code: "", version: 1, name: "", type: "THEORY",
    departmentId: role === "HOD" ? HOD_DEPARTMENT_ID : "", programId: "", weightageRule: "TOTAL_100", status: "DRAFT",
    components: [blankComponent(1, "THEORY")],
  });
  const [errors, setErrors] = useState<SchemeErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const update = (next: SchemeVersion) => { setS(next); setFormError(null); if (tried) setErrors(validateScheme(next, data)); };
  const setC = (i: number, patch: Partial<SchemeComponent>) => update({ ...s, components: s.components.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const num = (v: string) => (v.trim() === "" ? Number.NaN : Number(v));
  const show = (n: number) => (Number.isFinite(n) ? String(n) : "");
  const depts = data.department.filter((d) => d.status === "ACTIVE" && inSchemeScope(role, d.id));
  const progs = data.program.filter((p) => p.status === "ACTIVE" && p.departmentId === s.departmentId);

  const save = () => {
    setTried(true);
    const e = validateScheme(s, data); setErrors(e);
    if (Object.keys(e).length) { setFormError("Fix the highlighted fields."); return; }
    const r = initial ? updateScheme(s) : createScheme(s);
    if (typeof r === "string") { setFormError(r); return; }
    toast.success(initial ? `${s.code} Version ${s.version} saved` : `${r?.code ?? "Scheme"} created as Version 1 draft`);
    onClose();
  };

  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;
  const defaultType: ComponentType = s.type === "PRACTICAL" ? "PRACTICAL" : "THEORY";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${s.code} · Version ${s.version} (draft)` : "New Scheme"}</DialogTitle>
          <DialogDescription>{initial ? "Only drafts can be edited. Activate it when ready." : "A scheme code is assigned when you save. It starts as a Version 1 draft."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scheme name"><Input value={s.name} onChange={(e) => update({ ...s, name: e.target.value })} />{err("name")}</Field>
          <Field label="Type">
            <Select value={s.type} onValueChange={(v) => update({ ...s, type: v as SchemeType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(["THEORY", "PRACTICAL", "MIXED"] as const).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Department">
            <Select key={s.departmentId || "_"} {...(s.departmentId ? { value: s.departmentId } : {})} onValueChange={(v) => update({ ...s, departmentId: v, programId: "" })} disabled={role === "HOD"}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>{err("departmentId")}
          </Field>
          <Field label="Program">
            <Select key={s.programId || "_"} {...(s.programId ? { value: s.programId } : {})} onValueChange={(v) => update({ ...s, programId: v })} disabled={!s.departmentId}>
              <SelectTrigger><SelectValue placeholder={s.departmentId ? "Select program" : "Select department first"} /></SelectTrigger>
              <SelectContent>{progs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>{err("programId")}
          </Field>
          <Field label="Semester (optional)">
            <Select value={s.semesterId ?? "_none"} onValueChange={(v) => update({ ...s, semesterId: v === "_none" ? undefined : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="_none">Any semester</SelectItem>{data.semester.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Weightage rule">
            <Select value={s.weightageRule} onValueChange={(v) => update({ ...s, weightageRule: v as WeightageRule })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="TOTAL_100">Active components must total 100%</SelectItem><SelectItem value="NO_TOTAL">No fixed total</SelectItem></SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Components</h3>
            <span className="text-sm text-muted-foreground">Active weightage: {activeWeightage(s)}%</span>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-16">Order</TableHead><TableHead>Name</TableHead><TableHead className="w-24">Code</TableHead><TableHead className="w-32">Type</TableHead>
                <TableHead className="w-20">Max</TableHead><TableHead className="w-20">Pass</TableHead><TableHead className="w-20">Weight %</TableHead><TableHead className="w-16">Active</TableHead><TableHead className="w-10" />
              </TableRow></TableHeader>
              <TableBody>
                {s.components.map((c, i) => {
                  const k = (f: string) => `c.${i}.${f}`;
                  return (
                    <TableRow key={c.id} className="align-top">
                      <TableCell><Input aria-label={`Order ${i + 1}`} inputMode="numeric" value={show(c.sequence)} onChange={(e) => setC(i, { sequence: num(e.target.value) })} />{err(k("sequence"))}</TableCell>
                      <TableCell><Input aria-label={`Component name ${i + 1}`} value={c.name} onChange={(e) => setC(i, { name: e.target.value })} />{err(k("name"))}</TableCell>
                      <TableCell><Input aria-label={`Component code ${i + 1}`} value={c.code} onChange={(e) => setC(i, { code: e.target.value.toUpperCase() })} />{err(k("code"))}</TableCell>
                      <TableCell>
                        <Select value={c.type} onValueChange={(v) => setC(i, { type: v as ComponentType })}>
                          <SelectTrigger aria-label={`Component type ${i + 1}`}><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="THEORY">Theory</SelectItem><SelectItem value="PRACTICAL">Practical</SelectItem></SelectContent>
                        </Select>{err(k("type"))}
                      </TableCell>
                      <TableCell><Input aria-label={`Max marks ${i + 1}`} inputMode="decimal" value={show(c.maxMarks)} onChange={(e) => setC(i, { maxMarks: num(e.target.value) })} />{err(k("maxMarks"))}</TableCell>
                      <TableCell><Input aria-label={`Pass marks ${i + 1}`} inputMode="decimal" placeholder="—" value={c.passMarks === undefined ? "" : show(c.passMarks)}
                        onChange={(e) => setC(i, { passMarks: e.target.value.trim() === "" ? undefined : num(e.target.value) })} />{err(k("passMarks"))}</TableCell>
                      <TableCell><Input aria-label={`Weightage ${i + 1}`} inputMode="decimal" value={show(c.weightage)} onChange={(e) => setC(i, { weightage: num(e.target.value) })} />{err(k("weightage"))}</TableCell>
                      <TableCell className="pt-4"><Checkbox aria-label={`Active ${i + 1}`} checked={c.active} onCheckedChange={(v) => setC(i, { active: !!v })} /></TableCell>
                      <TableCell><Button size="icon" variant="ghost" aria-label={`Remove component ${i + 1}`} onClick={() => update({ ...s, components: s.components.filter((_, j) => j !== i) })}><Trash2 /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => update({ ...s, components: [...s.components, blankComponent(Math.max(0, ...s.components.map((c) => c.sequence || 0)) + 1, defaultType)] })}>
              <Plus /> Add component
            </Button>
          </div>
          {err("components")}{err("weightage")}
        </div>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
