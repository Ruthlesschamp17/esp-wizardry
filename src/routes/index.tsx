import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useProjects } from "@/lib/esp/store";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { FilePlus2, FolderOpen, Settings, Info, Trash2, ArrowRight, Calculator } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Intel Air ESP Pro" },
      { name: "description", content: "Manage your External Static Pressure projects. Fast, accurate HVAC engineering calculations." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const nav = useNavigate();
  const projects = useProjects((s) => s.projects);
  const order = useProjects((s) => s.order);
  const createProject = useProjects((s) => s.createProject);
  const deleteProject = useProjects((s) => s.deleteProject);

  const recent = order.map((id) => projects[id]).filter(Boolean).slice(0, 12);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-[1600px] px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          {/* Hero */}
          <section className="panel relative overflow-hidden p-8">
            <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Engineering Grade · ASHRAE · SMACNA
              </div>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
                Calculate External Static Pressure<br />
                <span className="text-primary">in under three minutes.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Intel Air ESP Pro is a dedicated ESP workspace for HVAC contractors and design engineers.
                Rigorous physics — Colebrook–White, Darcy–Weisbach, altitude and temperature corrections —
                wrapped in a fast, single-screen workflow.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => {
                  const id = createProject();
                  nav({ to: "/project/$id", params: { id } });
                }}>
                  <FilePlus2 className="mr-1.5 h-4 w-4" /> New Project
                </Button>
                <OpenProjectDialog />
                <AboutDialog />
              </div>
              <dl className="mt-8 grid grid-cols-3 gap-4 text-sm">
                <Stat label="Physics engine" value="Colebrook–White" />
                <Stat label="Fittings catalogue" value="ASHRAE / SMACNA" />
                <Stat label="Reports" value="PDF · Excel" />
              </dl>
            </div>
          </section>

          {/* Quick actions */}
          <section className="grid grid-cols-2 gap-4 content-start">
            <QuickCard icon={<FilePlus2 className="h-5 w-5" />} title="New Project" desc="Start a fresh ESP calculation."
              onClick={() => { const id = createProject(); nav({ to: "/project/$id", params: { id } }); }} />
            <QuickCard icon={<FolderOpen className="h-5 w-5" />} title="Open" desc="Recent projects list." />
            <QuickCard icon={<Settings className="h-5 w-5" />} title="Preferences" desc="Units, defaults, safety factor." />
            <QuickCard icon={<Info className="h-5 w-5" />} title="About" desc="Version and engineering references." />
          </section>
        </div>

        {/* Recent projects */}
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent Projects</h2>
            <span className="text-xs text-muted-foreground numeric">{recent.length} total</span>
          </div>
          {recent.length === 0 ? (
            <div className="panel grid place-items-center p-12 text-sm text-muted-foreground">
              <Calculator className="mb-2 h-6 w-6 opacity-60" />
              No projects yet. Create your first ESP calculation to get started.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((p) => (
                <div key={p.meta.id} className="panel group flex flex-col p-5 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{p.meta.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                        {p.meta.client || "No client"} · {p.meta.ahuTag}
                      </div>
                    </div>
                    <button onClick={() => deleteProject(p.meta.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-end justify-between text-xs">
                    <span className="text-muted-foreground">Updated {formatDistanceToNow(p.meta.updatedAt, { addSuffix: true })}</span>
                    <Link to="/workspace/$id" params={{ id: p.meta.id }}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function QuickCard({ icon, title, desc, onClick }: { icon: React.ReactNode; title: string; desc: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="panel text-left p-5 hover:border-primary/60 hover:bg-panel/80 transition-colors">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 text-primary">{icon}</div>
      <div className="mt-3 font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}

function OpenProjectDialog() {
  const projects = useProjects((s) => s.projects);
  const order = useProjects((s) => s.order);
  const list = order.map((id) => projects[id]).filter(Boolean);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg"><FolderOpen className="mr-1.5 h-4 w-4" /> Open Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Open Project</DialogTitle></DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto">
          {list.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No saved projects.</div>}
          <ul className="divide-y divide-border">
            {list.map((p) => (
              <li key={p.meta.id}>
                <Link to="/workspace/$id" params={{ id: p.meta.id }}
                  className="flex items-center justify-between px-2 py-3 hover:bg-secondary rounded">
                  <div>
                    <div className="font-medium">{p.meta.name}</div>
                    <div className="text-xs text-muted-foreground">{p.meta.client || "—"} · {p.meta.ahuTag}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="lg"><Info className="mr-1.5 h-4 w-4" /> About</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>About Intel Air ESP Pro</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p>Intel Air ESP Pro is a dedicated External Static Pressure calculator for HVAC contractors and consulting engineers.</p>
          <p className="text-muted-foreground">Engineering references:</p>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
            <li>ASHRAE Handbook — Fundamentals (Duct Design, Air Properties)</li>
            <li>ASHRAE Duct Fitting Database (loss coefficients)</li>
            <li>SMACNA HVAC Duct Design Manual</li>
            <li>Colebrook–White equation, Darcy–Weisbach, Huebscher equivalent diameter</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">Version 1.0 · Web edition</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
