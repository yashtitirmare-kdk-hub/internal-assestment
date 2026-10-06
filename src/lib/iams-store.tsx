import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  departmentOf, HOD_DEPARTMENT_ID, makeSeed, type EntityKind, type MasterData, type Role, type Row,
} from "./iams-data";

interface Store {
  role: Role;
  setRole: (r: Role) => void;
  data: MasterData;
  /** Rows visible to the current role. */
  scoped: (k: EntityKind) => Row[];
  upsert: (k: EntityKind, row: Row) => void;
  remove: (k: EntityKind, id: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function IamsProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("ADMIN");
  const [data, setData] = useState<MasterData>(() => makeSeed());

  const value = useMemo<Store>(() => ({
    role,
    setRole,
    data,
    scoped: (k) =>
      role === "ADMIN" ? data[k] : data[k].filter((r) => departmentOf(k, r, data) === HOD_DEPARTMENT_ID),
    upsert: (k, row) =>
      setData((d) => ({
        ...d,
        [k]: d[k].some((r) => r.id === row.id) ? d[k].map((r) => (r.id === row.id ? row : r)) : [...d[k], row],
      })),
    remove: (k, id) => setData((d) => ({ ...d, [k]: d[k].filter((r) => r.id !== id) })),
  }), [role, data]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIams() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useIams outside provider");
  return c;
}
