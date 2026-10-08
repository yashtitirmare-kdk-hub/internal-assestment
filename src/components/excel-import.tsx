import { useState } from "react";
import { Check, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { downloadTemplate, readRows, type ImportColumn } from "@/services/excel";

import type { ValidatedRow } from "@/services/people-rules";
export type { ValidatedRow };

const STEPS = ["Download Template", "Upload", "Validate", "Preview", "Confirm"];

/** Template → Upload → Validate → Preview → Confirm. Never imports on file selection. */
export function ExcelImportDialog<T>({ title, templateName, columns, validate, onConfirm, onClose }: {
  title: string;
  templateName: string;
  columns: ImportColumn[];
  validate: (rows: Record<string, string>[]) => ValidatedRow<T>[];
  onConfirm: (values: T[]) => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ValidatedRow<T>[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const step = result ? 3 : file ? 2 : 1;
  const valid = result?.filter((r) => r.errors.length === 0) ?? [];
  const invalid = result?.filter((r) => r.errors.length > 0) ?? [];

  const runValidate = async () => {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const rows = await readRows(file, columns);
      if (rows.length === 0) setErr("The file has no data rows.");
      else setResult(validate(rows));
    } catch {
      setErr("Could not read this file. Use the .xlsx template.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Rows are only added after you review and confirm.</DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap gap-1.5 text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1",
              i < step ? "border-primary/30 bg-primary/10 text-primary" : i === step ? "border-primary font-medium" : "text-muted-foreground")}>
              {i < step ? <Check className="size-3" /> : <span className="font-mono">{i + 1}</span>}{s}
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
          <Button variant="outline" size="sm" onClick={() => downloadTemplate(templateName, columns)}><Download /> Download template</Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent">
            <Upload className="size-4" /> {file ? "Change file" : "Choose .xlsx file"}
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setErr(null); }} />
          </label>
          {file && <span className="flex items-center gap-1 truncate text-xs text-muted-foreground"><FileSpreadsheet className="size-3.5" />{file.name}</span>}
          <Button size="sm" className="ml-auto" disabled={!file || busy} onClick={runValidate}>{busy ? "Validating…" : "Validate"}</Button>
        </div>
        <p className="text-xs text-muted-foreground">Columns: {columns.map((c) => `${c.header}${c.required ? "*" : ""}`).join(", ")}</p>
        {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}

        {result && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Total rows" value={result.length} />
              <Stat label="Valid" value={valid.length} tone="success" />
              <Stat label="Invalid" value={invalid.length} tone={invalid.length ? "error" : undefined} />
            </div>
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Row</TableHead>
                    {columns.slice(0, 4).map((c) => <TableHead key={c.key}>{c.header}</TableHead>)}
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.map((r) => (
                    <TableRow key={r.line} className={r.errors.length ? "bg-destructive/5" : undefined}>
                      <TableCell className="font-mono text-xs">{r.line}</TableCell>
                      {columns.slice(0, 4).map((c) => <TableCell key={c.key} className="whitespace-nowrap text-xs">{r.raw[c.key] || "—"}</TableCell>)}
                      <TableCell className="text-xs">
                        {r.errors.length ? <span className="text-destructive">{r.errors.join("; ")}</span> : <Badge variant="success">Valid</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid.length} onClick={() => onConfirm(valid.map((v) => v.value!))}>
            Confirm import{valid.length ? ` (${valid.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "error" | undefined }) {
  return (
    <div className="rounded-md border p-2">
      <div className={cn("font-mono text-xl font-semibold", tone === "success" && "text-success", tone === "error" && "text-destructive")}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
