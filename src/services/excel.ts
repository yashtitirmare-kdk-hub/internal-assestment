/** Excel helpers (browser only — xlsx is loaded on demand). */
export interface ImportColumn {
  key: string;
  header: string;
  required?: boolean;
  example: string;
}

export async function downloadTemplate(fileName: string, columns: ImportColumn[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), columns.map((c) => c.example)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, fileName);
}

/** Reads the first sheet and maps headers back to column keys. */
export async function readRows(file: File, columns: ImportColumn[]): Promise<Record<string, string>[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer());
  const ws = wb.Sheets[wb.SheetNames[0] ?? ""]!;
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  return raw.map((r) => {
    const out: Record<string, string> = {};
    for (const c of columns) out[c.key] = String(r[c.header] ?? "").trim();
    return out;
  });
}
