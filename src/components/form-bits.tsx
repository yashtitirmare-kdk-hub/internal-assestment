import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ALL = "__all";

export function FilterSelect({ value, onChange, placeholder, options, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; options: { value: string; label: string }[]; disabled?: boolean | undefined;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={!!disabled}>
      <SelectTrigger className="h-9 w-full sm:w-[170px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}
