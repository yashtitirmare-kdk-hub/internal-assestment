import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Database, Users, GraduationCap, ClipboardList, Layers,
  FileCheck2, BarChart3, ShieldCheck,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIams } from "@/lib/iams-store";
import { ROLE_LABEL, type Role } from "@/lib/iams-data";

type Nav = { title: string; facultyTitle?: string; icon: typeof Database; to?: "/" | "/master-data" | "/faculty" | "/students"; roles: Role[] };
const MGMT: Role[] = ["ADMIN", "HOD"];

const NAV: Nav[] = [
  { title: "Dashboard", icon: LayoutDashboard, to: "/", roles: ["ADMIN", "HOD", "CLASS_INCHARGE", "FACULTY"] },
  { title: "Master Data", icon: Database, to: "/master-data", roles: MGMT },
  { title: "Faculty", icon: Users, to: "/faculty", roles: MGMT },
  { title: "Students", facultyTitle: "My Students", icon: GraduationCap, to: "/students", roles: [...MGMT, "CLASS_INCHARGE", "FACULTY"] },
  { title: "Faculty Assignments", facultyTitle: "My Assignments", icon: ClipboardList, roles: [...MGMT, "CLASS_INCHARGE", "FACULTY"] },
  { title: "Schemes", icon: Layers, roles: MGMT },
  { title: "Assessments", icon: FileCheck2, roles: ["ADMIN", "HOD", "CLASS_INCHARGE", "FACULTY"] },
  { title: "Reports", icon: BarChart3, roles: ["ADMIN", "HOD", "CLASS_INCHARGE", "FACULTY"] },
  { title: "Audit", icon: ShieldCheck, roles: MGMT },
];

function AppSidebar() {
  const { role } = useIams();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((n) => n.roles.includes(role)).map((n) => ({ ...n, title: role === "FACULTY" && n.facultyTitle ? n.facultyTitle : n.title }));
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary font-mono text-xs font-bold text-sidebar-primary-foreground">IA</div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="font-semibold">IAMS</div>
            <div className="text-xs text-sidebar-foreground/60">Internal Assessment</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((n) => (
                <SidebarMenuItem key={n.title}>
                  {n.to ? (
                    <SidebarMenuButton asChild isActive={path === n.to} tooltip={n.title}>
                      <Link to={n.to}><n.icon /><span>{n.title}</span></Link>
                    </SidebarMenuButton>
                  ) : (
                    <>
                      <SidebarMenuButton disabled tooltip={`${n.title} — coming soon`} className="opacity-50">
                        <n.icon /><span>{n.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge className="text-[10px]">Soon</SidebarMenuBadge>
                    </>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole } = useIams();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">Demo — viewing as</span>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
