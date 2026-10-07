import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useIams } from "@/lib/iams-store";
import { ENTITY_META, ROLE_LABEL, type EntityKind } from "@/lib/iams-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — IAMS Internal Assessment" },
      { name: "description", content: "Overview of programs, classes, sections and subjects for internal assessment." },
      { property: "og:title", content: "Dashboard — IAMS Internal Assessment" },
      { property: "og:description", content: "College internal assessment management at a glance." },
    ],
  }),
  component: Dashboard,
});

const STATS: EntityKind[] = ["program", "class", "section", "subject"];

function Dashboard() {
  const { role, scoped } = useIams();
  const manages = role === "ADMIN" || role === "HOD";
  return (
    <>
      <PageHeader
        title={`Welcome back`}
        description={`${ROLE_LABEL[role]}${role === "ADMIN" ? " · All departments" : " · Computer Applications"}`}
        actions={manages && <Button asChild variant="outline"><Link to="/master-data">Open Master Data <ArrowRight /></Link></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((k) => (
          <div key={k} className="rounded-lg border bg-card p-5 shadow-card">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{ENTITY_META[k].plural}</div>
            <div className="mt-2 font-mono text-3xl font-semibold">{scoped(k).length}</div>
            <div className="mt-1 text-xs text-muted-foreground">{scoped(k).filter((r) => r.status === "ACTIVE").length} active</div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground">
        Faculty and Students are ready. Faculty Assignments, Schemes, Assessments, Reports and Audit are not built yet and show as "Soon". Use the role selector at the top right to preview what each role sees.
      </div>
    </>
  );
}
