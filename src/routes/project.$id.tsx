import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjects } from "@/lib/esp/store";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/project/$id")({
  head: () => ({
    meta: [
      { title: "Project — Intel Air ESP Pro" },
      { name: "description", content: "Configure project metadata and engineering defaults for your ESP calculation." },
    ],
  }),
  component: ProjectSetup,
});

function ProjectSetup() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const project = useProjects((s) => s.projects[id]);
  const update = useProjects((s) => s.updateProject);

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="p-10 text-center text-muted-foreground">Project not found.</div>
      </div>
    );
  }

  const m = project.meta;
  const set = (patch: Partial<typeof m>) =>
    update(id, (p) => ({ ...p, meta: { ...p.meta, ...patch } }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="Project Setup" right={
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/" })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
        </Button>
      } />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Step 1 of 3</div>
          <h1 className="mt-1 text-2xl font-semibold">Project Details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            These details appear on your PDF and Excel reports.
          </p>
        </div>

        <div className="panel p-6 space-y-5">
          <Field label="Project Name" required>
            <Input value={m.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. King Fahd Medical City — Level 3 HVAC" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client"><Input value={m.client} onChange={(e) => set({ client: e.target.value })} /></Field>
            <Field label="Consultant"><Input value={m.consultant} onChange={(e) => set({ consultant: e.target.value })} /></Field>
            <Field label="Engineer"><Input value={m.engineer} onChange={(e) => set({ engineer: e.target.value })} /></Field>
            <Field label="Project Number"><Input value={m.projectNumber} onChange={(e) => set({ projectNumber: e.target.value })} /></Field>
            <Field label="AHU Tag"><Input value={m.ahuTag} onChange={(e) => set({ ahuTag: e.target.value })} /></Field>
            <Field label="Location"><Input value={m.location} onChange={(e) => set({ location: e.target.value })} placeholder="City, Country" /></Field>
          </div>

          <div className="pt-2 mt-2 border-t border-border">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Engineering Defaults</div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Altitude (m)" hint="Barometric correction">
                <Input type="number" value={m.altitude}
                  onChange={(e) => set({ altitude: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Units">
                <Select value={m.units} onValueChange={(v) => set({ units: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SI">SI (Pa · L/s · mm)</SelectItem>
                    <SelectItem value="IP">Imperial (inWG · CFM · in)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Safety Factor" hint="+10 % typical">
                <Input type="number" step="0.05" min="1" max="1.5"
                  value={m.safetyFactor}
                  onChange={(e) => set({ safetyFactor: Number(e.target.value) || 1 })} />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => nav({ to: "/" })}>Cancel</Button>
          <Button size="lg" onClick={() => {
            if (!m.name.trim()) { toast.error("Project name is required"); return; }
            nav({ to: "/workspace/$id", params: { id } });
          }}>
            Continue to ESP Workspace <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}

function Field({ label, hint, required, children }:
  { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-primary">*</span>}
        {hint && <span className="ml-1 text-[10px] opacity-70">· {hint}</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
