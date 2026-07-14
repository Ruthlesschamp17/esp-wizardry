import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjects } from "@/lib/esp/store";
import { calculate } from "@/lib/esp/calculator";
import { MATERIAL_LABEL } from "@/lib/esp/physics";
import { TERMINAL_LABEL, TERMINAL_DEFAULT_PA, EXTERNAL_COMPONENT_PRESETS } from "@/lib/esp/defaults";
import { FITTINGS, FITTING_CATEGORIES } from "@/lib/esp/fittings";
import type { DuctSegment, Fitting, SegmentKind, Shape, TerminalKind } from "@/lib/esp/types";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, FileText, Plus, Trash2, Wrench, Copy, Gauge, Sparkles, Wind, Layers, Route as RouteIcon, Cog } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/workspace/$id")({
  head: () => ({
    meta: [
      { title: "ESP Workspace — Intel Air ESP Pro" },
      { name: "description", content: "External Static Pressure workspace — project info, external components, duct network and terminals." },
    ],
  }),
  component: Workspace,
});

const kindLabel: Record<SegmentKind, string> = {
  supply: "Supply", return: "Return", fresh: "Fresh Air", exhaust: "Exhaust",
};

const AIRFLOW_UNITS = ["L/s", "CMH", "CFM"] as const;

function fmt(n: number, d = 1) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Workspace() {
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

  const result = useMemo(() => calculate(project), [project]);
  const set = (updater: (p: typeof project) => typeof project) => update(id, updater);
  const unit = project.meta.airflowUnit ?? "L/s";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle={`${project.meta.name} · ${project.meta.ahuTag}`} right={
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-1.5 text-xs">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">External Static Pressure</span>
            <span className="numeric font-semibold text-primary">{fmt(result.totalEspPa, 0)} Pa</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => nav({ to: "/project/$id", params: { id } })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Project
          </Button>
          <Button size="sm" onClick={() => nav({ to: "/report/$id", params: { id } })}>
            <FileText className="h-4 w-4 mr-1" /> Report
          </Button>
        </div>
      } />

      <main className="mx-auto max-w-[1600px] px-6 py-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6 min-w-0">
          {/* SECTION A — Project Information */}
          <Panel icon={<Wind className="h-4 w-4" />} title="A · Project Information"
            subtitle="Reference details and airflow volumes — used for documentation">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <TextField label="Project Name" value={project.meta.name}
                onChange={(v) => set((p) => ({ ...p, meta: { ...p.meta, name: v } }))} />
              <TextField label="Client" value={project.meta.client}
                onChange={(v) => set((p) => ({ ...p, meta: { ...p.meta, client: v } }))} />
              <TextField label="AHU Number" value={project.meta.ahuTag}
                onChange={(v) => set((p) => ({ ...p, meta: { ...p.meta, ahuTag: v } }))} />
              <TextField label="Prepared By" value={project.meta.preparedBy ?? project.meta.engineer}
                onChange={(v) => set((p) => ({ ...p, meta: { ...p.meta, preparedBy: v } }))} />
              <div>
                <Label className="text-xs text-muted-foreground">Airflow Unit</Label>
                <Select value={unit}
                  onValueChange={(v) => set((p) => ({ ...p, meta: { ...p.meta, airflowUnit: v as any } }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AIRFLOW_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <NumField label={`Supply Airflow (${unit})`} value={project.airflow.supply}
                onChange={(v) => set((p) => ({ ...p, airflow: { ...p.airflow, supply: v } }))} />
              <NumField label={`Return Airflow (${unit}) — optional`} value={project.airflow.return_}
                onChange={(v) => set((p) => ({ ...p, airflow: { ...p.airflow, return_: v } }))} />
              <NumField label={`Fresh Airflow (${unit}) — optional`} value={project.airflow.fresh}
                onChange={(v) => set((p) => ({ ...p, airflow: { ...p.airflow, fresh: v } }))} />
              <NumField label={`Exhaust Airflow (${unit}) — optional`} value={project.airflow.exhaust}
                onChange={(v) => set((p) => ({ ...p, airflow: { ...p.airflow, exhaust: v } }))} />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Airflow values are reference-only for the report. Duct pressure loss is driven by the per-section airflow you enter in the Duct Network table.
            </p>
          </Panel>

          {/* SECTION B — External Components */}
          <Panel icon={<Layers className="h-4 w-4" />} title="B · External Components"
            subtitle={`Selected components loss: ${fmt(result.ahuInternalLoss, 0)} Pa · internal AHU losses excluded`}
            action={
              <Select value=""
                onValueChange={(name) => {
                  if (!name) return;
                  const preset = EXTERNAL_COMPONENT_PRESETS.find((p) => p.name === name);
                  set((p) => ({
                    ...p, ahuComponents: [...p.ahuComponents, {
                      id: "ext-" + Math.random().toString(36).slice(2, 8),
                      name: preset ? preset.name : "Custom Component",
                      enabled: true,
                      pressureDrop: preset ? preset.pa : 0,
                    }],
                  }));
                }}>
                <SelectTrigger className="h-8 w-52">
                  <span className="flex items-center gap-1.5 text-sm"><Plus className="h-3.5 w-3.5" /> Add Component</span>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {EXTERNAL_COMPONENT_PRESETS.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name} <span className="text-muted-foreground">· {c.pa} Pa</span></SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom Component…</SelectItem>
                </SelectContent>
              </Select>
            }>
            {project.ahuComponents.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No external components yet. Use <b>+ Add Component</b> to select any dampers, filters, silencers or terminals installed on the duct side.
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {project.ahuComponents.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2">
                    <Checkbox checked={c.enabled}
                      onCheckedChange={(v) => set((p) => ({
                        ...p, ahuComponents: p.ahuComponents.map((x) => x.id === c.id ? { ...x, enabled: !!v } : x),
                      }))} />
                    <Input className="h-8 flex-1 min-w-0 text-sm" value={c.name}
                      onChange={(e) => set((p) => ({
                        ...p, ahuComponents: p.ahuComponents.map((x) =>
                          x.id === c.id ? { ...x, name: e.target.value } : x),
                      }))} />
                    <div className="flex items-center gap-1">
                      <Input type="number" className="h-8 w-20 text-right numeric" value={c.pressureDrop}
                        onChange={(e) => set((p) => ({
                          ...p, ahuComponents: p.ahuComponents.map((x) =>
                            x.id === c.id ? { ...x, pressureDrop: Number(e.target.value) || 0 } : x),
                        }))} />
                      <span className="text-xs text-muted-foreground">Pa</span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => set((p) => ({
                        ...p, ahuComponents: p.ahuComponents.filter((x) => x.id !== c.id),
                      }))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">
              Tick to include, edit pressure drop as needed. Fan, coils, internal AHU filters, mixing box and drain pan are computed by the AHU manufacturer and are <b>never</b> added here.
            </p>
          </Panel>

          {/* SECTION C — Ducts */}
          <Panel icon={<RouteIcon className="h-4 w-4" />} title="C · Duct Network"
            subtitle={`Colebrook–White, Huebscher equivalent diameter${result.criticalRun ? ` · Critical Run: ${result.criticalRun}` : ""}`}
            action={
              <Button size="sm" variant="secondary" onClick={() => set((p) => ({
                ...p, segments: [...p.segments, newSegment(p.segments.length + 1)],
              }))}>
                <Plus className="h-4 w-4 mr-1" /> Add Section
              </Button>
            }>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All ({project.segments.length})</TabsTrigger>
                <TabsTrigger value="supply">Supply</TabsTrigger>
                <TabsTrigger value="return">Return</TabsTrigger>
                <TabsTrigger value="fresh">Fresh</TabsTrigger>
                <TabsTrigger value="exhaust">Exhaust</TabsTrigger>
              </TabsList>
              {(["all", "supply", "return", "fresh", "exhaust"] as const).map((k) => (
                <TabsContent key={k} value={k} className="mt-3">
                  <DuctTable
                    segments={k === "all" ? project.segments : project.segments.filter((s) => s.kind === k)}
                    results={result.segments}
                    criticalRun={result.criticalRun}
                    onChange={(id, patch) => set((p) => ({
                      ...p, segments: p.segments.map((s) => s.id === id ? { ...s, ...patch } : s),
                    }))}
                    onDelete={(id) => set((p) => ({ ...p, segments: p.segments.filter((s) => s.id !== id) }))}
                    onDuplicate={(id) => set((p) => {
                      const seg = p.segments.find((s) => s.id === id);
                      if (!seg) return p;
                      const clone = { ...seg, id: "seg-" + Math.random().toString(36).slice(2, 8),
                        section: seg.section + "'", fittings: seg.fittings.map((f) => ({ ...f, id: "f-" + Math.random().toString(36).slice(2, 8) })) };
                      return { ...p, segments: [...p.segments, clone] };
                    })}
                    onFittings={(id, fittings) => set((p) => ({
                      ...p, segments: p.segments.map((s) => s.id === id ? { ...s, fittings } : s),
                    }))}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </Panel>

          {/* SECTION E — Terminal / Air Distribution Device */}
          <Panel icon={<Sparkles className="h-4 w-4" />} title="D · Terminal / Air Distribution Device"
            subtitle="Diffuser / grille pressure drop — editable">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={project.terminal.kind}
                  onValueChange={(v) => set((p) => ({
                    ...p, terminal: { kind: v as TerminalKind, pressureDrop: TERMINAL_DEFAULT_PA[v as TerminalKind] },
                  }))}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TERMINAL_LABEL) as TerminalKind[]).map((t) =>
                      <SelectItem key={t} value={t}>{TERMINAL_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <NumField label="Pressure Drop (Pa)" value={project.terminal.pressureDrop}
                onChange={(v) => set((p) => ({ ...p, terminal: { ...p.terminal, pressureDrop: v } }))} />
            </div>
          </Panel>

          {/* Advanced */}
          <Panel icon={<Cog className="h-4 w-4" />} title="Engineering Details"
            action={
              <Button size="sm" variant="ghost" onClick={() =>
                set((p) => ({ ...p, advancedMode: !p.advancedMode }))}>
                {project.advancedMode ? "Hide" : "Show Engineering Details"}
              </Button>
            }>
            {project.advancedMode ? (
              <div className="text-xs space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Air density (ρ)" value={`${fmt(result.airDensity, 4)} kg/m³`} />
                  <Metric label="Dyn. viscosity (μ)" value={result.dynamicViscosity.toExponential(3) + " Pa·s"} />
                  <Metric label="Safety" value={`+ ${((project.meta.safetyFactor - 1) * 100).toFixed(0)} %`} />
                </div>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs numeric">
                    <thead className="bg-secondary text-secondary-foreground">
                      <tr>
                        {["Sec", "V m/s", "A m²", "Dh m", "De m", "Re", "ε/D", "f", "Vp Pa", "ΔP/m", "Straight", "Fittings", "Total"].map((h) =>
                          <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.segments.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-2 py-1">{r.section}</td>
                          <td className="px-2 py-1">{fmt(r.velocityMs, 2)}</td>
                          <td className="px-2 py-1">{fmt(r.areaM2, 3)}</td>
                          <td className="px-2 py-1">{fmt(r.hydraulicDiameterM, 3)}</td>
                          <td className="px-2 py-1">{fmt(r.equivalentDiameterM, 3)}</td>
                          <td className="px-2 py-1">{fmt(r.reynolds, 0)}</td>
                          <td className="px-2 py-1">{r.relativeRoughness.toExponential(2)}</td>
                          <td className="px-2 py-1">{fmt(r.frictionFactor, 4)}</td>
                          <td className="px-2 py-1">{fmt(r.velocityPressurePa, 1)}</td>
                          <td className="px-2 py-1">{fmt(r.frictionPerMPa, 2)}</td>
                          <td className="px-2 py-1">{fmt(r.straightLossPa, 1)}</td>
                          <td className="px-2 py-1">{fmt(r.fittingLossPa, 1)}</td>
                          <td className="px-2 py-1 font-semibold">{fmt(r.totalLossPa, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-muted-foreground">
                  <p><b className="text-foreground">Darcy–Weisbach:</b> ΔP = f · (L/Dh) · ½ρV²</p>
                  <p><b className="text-foreground">Colebrook–White</b> solved via Serghides explicit approximation (error &lt; 10⁻⁸).</p>
                  <p><b className="text-foreground">Huebscher equivalent diameter:</b> Dₑ = 1.30·(a·b)<sup>0.625</sup> / (a+b)<sup>0.25</sup>.</p>
                  <p><b className="text-foreground">Air density:</b> ρ = P/(R·T); P = 101 325·(1 − 2.256·10⁻⁵·h)<sup>5.256</sup>.</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Advanced physics, per-section breakdown and all equations are hidden. Click "Show Engineering Details" to expand.</div>
            )}
          </Panel>
        </div>

        {/* Sticky Result rail */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <div className="panel p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">External Static Pressure</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="numeric text-4xl font-semibold text-primary">{fmt(result.totalEspPa, 0)}</span>
                <span className="text-sm text-muted-foreground">Pa</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground numeric">
                ≈ {fmt(result.totalEspPa / 9.80665, 1)} mmWG · {fmt(result.totalEspPa / 249.089, 3)} in.w.g.
              </div>

              <div className="mt-4 space-y-1.5 text-xs">
                <Row label="External Components" value={result.ahuInternalLoss} />
                <Row label="Supply Duct Loss" value={result.supplyLoss} />
                <Row label="Return Duct Loss" value={result.returnLoss} />
                <Row label="Fresh Air Loss" value={result.freshLoss} />
                <Row label="Exhaust Air Loss" value={result.exhaustLoss} />
                <Row label="Terminal Loss" value={result.terminalLoss} />
                <div className="border-t border-border my-2" />
                <Row label="Subtotal" value={result.subtotalPa} strong />
                <Row label={`Safety Factor (+${((project.meta.safetyFactor - 1) * 100).toFixed(0)} %)`} value={result.safetyAddedPa} />
                <Row label="FINAL EXTERNAL STATIC PRESSURE" value={result.totalEspPa} strong highlight />
              </div>

              <div className="mt-4 rounded-md bg-background/60 border border-border p-3 text-[11px] text-muted-foreground leading-relaxed">
                This External Static Pressure value is submitted to the AHU manufacturer. Internal AHU losses are intentionally excluded.
              </div>

              {result.criticalRun && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Critical Run</div>
                  <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded bg-primary/15 text-primary">
                    {result.criticalRun}
                  </span>
                </div>
              )}

              <Button className="mt-5 w-full" onClick={() => nav({ to: "/report/$id", params: { id } })}>
                <FileText className="h-4 w-4 mr-1.5" /> Open Report
              </Button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

/* ---------- helpers ---------- */

function newSegment(n: number): DuctSegment {
  return {
    id: "seg-" + Math.random().toString(36).slice(2, 8),
    section: `S${n}`, kind: "supply", airflow: 500, shape: "rect",
    width: 400, height: 250, diameter: 350, length: 5, material: "galvanized",
    remark: "", runId: "Run 1",
    fittings: [],
  };
}

function Panel({ icon, title, subtitle, action, children }:
  { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function NumField({ label, value, onChange }:
  { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" className="mt-1.5 numeric" value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function TextField({ label, value, onChange }:
  { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input className="mt-1.5" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm numeric font-semibold">{value}</div>
    </div>
  );
}

function Row({ label, value, strong, highlight }:
  { label: string; value: number; strong?: boolean; highlight?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold" : ""} ${highlight ? "text-primary" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="numeric">{fmt(value, 0)} Pa</span>
    </div>
  );
}

/* ---------- duct table ---------- */

function DuctTable({ segments, results, criticalRun, onChange, onDelete, onDuplicate, onFittings }: {
  segments: DuctSegment[];
  results: ReturnType<typeof calculate>["segments"];
  criticalRun?: string;
  onChange: (id: string, patch: Partial<DuctSegment>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onFittings: (id: string, fittings: Fitting[]) => void;
}) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              {["Sec", "Run", "Remark", "Type", "Q L/s", "Shape", "W mm", "H mm", "Ø mm", "L m", "Material", "Fittings", "V m/s", "ΔP Pa", ""].map((h) =>
                <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => {
              const r = results.find((x) => x.id === s.id);
              const vColor = !r ? "" : r.velocityMs > 12 ? "text-destructive" : r.velocityMs > 8 ? "text-warning" : r.velocityMs < 2 ? "text-warning" : "text-success";
              const isCritical = criticalRun && (s.runId || s.section) === criticalRun && s.kind === "supply";
              return (
                <tr key={s.id} className={`border-t border-border hover:bg-background/40 ${isCritical ? "bg-primary/5" : ""}`}>
                  <td className="px-1 py-1"><Input className="h-8 w-16" value={s.section}
                    onChange={(e) => onChange(s.id, { section: e.target.value })} /></td>
                  <td className="px-1 py-1"><Input className="h-8 w-20" placeholder="Run 1" value={s.runId ?? ""}
                    onChange={(e) => onChange(s.id, { runId: e.target.value })} /></td>
                  <td className="px-1 py-1"><Input className="h-8 w-32" placeholder="e.g. Reception" value={s.remark ?? ""}
                    onChange={(e) => onChange(s.id, { remark: e.target.value })} /></td>
                  <td className="px-1 py-1">
                    <Select value={s.kind} onValueChange={(v) => onChange(s.id, { kind: v as SegmentKind })}>
                      <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(kindLabel) as SegmentKind[]).map((k) =>
                          <SelectItem key={k} value={k}>{kindLabel[k]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1"><Input type="number" className="h-8 w-20 numeric text-right" value={s.airflow}
                    onChange={(e) => onChange(s.id, { airflow: Number(e.target.value) || 0 })} /></td>
                  <td className="px-1 py-1">
                    <Select value={s.shape} onValueChange={(v) => onChange(s.id, { shape: v as Shape })}>
                      <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rect">Rectangular</SelectItem>
                        <SelectItem value="round">Round</SelectItem>
                        <SelectItem value="flat-oval">Flat-oval</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1"><Input type="number" className="h-8 w-20 numeric text-right"
                    value={s.width} disabled={s.shape === "round"}
                    onChange={(e) => onChange(s.id, { width: Number(e.target.value) || 0 })} /></td>
                  <td className="px-1 py-1"><Input type="number" className="h-8 w-20 numeric text-right"
                    value={s.height} disabled={s.shape === "round"}
                    onChange={(e) => onChange(s.id, { height: Number(e.target.value) || 0 })} /></td>
                  <td className="px-1 py-1"><Input type="number" className="h-8 w-20 numeric text-right"
                    value={s.diameter} disabled={s.shape !== "round"}
                    onChange={(e) => onChange(s.id, { diameter: Number(e.target.value) || 0 })} /></td>
                  <td className="px-1 py-1"><Input type="number" className="h-8 w-16 numeric text-right" value={s.length}
                    onChange={(e) => onChange(s.id, { length: Number(e.target.value) || 0 })} /></td>
                  <td className="px-1 py-1">
                    <Select value={s.material} onValueChange={(v) => onChange(s.id, { material: v as any })}>
                      <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MATERIAL_LABEL).map(([k, v]) =>
                          <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-1 py-1">
                    <FittingsButton segment={s} onChange={(f) => onFittings(s.id, f)} />
                  </td>
                  <td className={`px-2 py-1 numeric text-right font-medium ${vColor}`}>{r ? fmt(r.velocityMs, 2) : "—"}</td>
                  <td className="px-2 py-1 numeric text-right font-semibold">{r ? fmt(r.totalLossPa, 1) : "—"}</td>
                  <td className="px-1 py-1">
                    <div className="flex gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDuplicate(s.id)} title="Duplicate">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => onDelete(s.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {segments.length === 0 && (
              <tr><td colSpan={15} className="p-6 text-center text-muted-foreground">No sections. Click "Add Section" to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- fittings dialog ---------- */

function FittingsButton({ segment, onChange }: { segment: DuctSegment; onChange: (f: Fitting[]) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [local, setLocal] = useState<Fitting[]>(segment.fittings);
  const [category, setCategory] = useState<string>("All");

  const totalK = local.reduce((s, f) => s + (f.overrideK ?? f.k) * f.qty, 0);

  const filtered = FITTINGS.filter((f) =>
    (category === "All" || f.category === category) &&
    (search === "" || f.name.toLowerCase().includes(search.toLowerCase()) || f.code.toLowerCase().includes(search.toLowerCase()))
  );

  const addFitting = (code: string) => {
    const def = FITTINGS.find((f) => f.code === code);
    if (!def) return;
    const existing = local.find((x) => x.code === code);
    if (existing) {
      setLocal(local.map((x) => x.code === code ? { ...x, qty: x.qty + 1 } : x));
    } else {
      setLocal([...local, {
        id: "f-" + Math.random().toString(36).slice(2, 8),
        code: def.code, name: def.name, category: def.category, k: def.k, qty: 1,
      }]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setLocal(segment.fittings); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8">
          <Wrench className="h-3 w-3 mr-1" />
          {segment.fittings.length} · K={fmt(segment.fittings.reduce((s, f) => s + (f.overrideK ?? f.k) * f.qty, 0), 2)}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Fittings — Section {segment.section}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_1fr] gap-4">
          {/* Catalogue */}
          <div>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Search fittings..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All categories</SelectItem>
                  {FITTING_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-96 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {filtered.map((f) => (
                <button key={f.code} onClick={() => addFitting(f.code)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary text-left">
                  <div>
                    <div className="text-sm">{f.name}</div>
                    <div className="text-[10px] text-muted-foreground">{f.code} · {f.category}{(f as any).ref ? ` · ${(f as any).ref}` : ""}</div>
                  </div>
                  <span className="text-xs numeric font-medium">K = {f.k}</span>
                </button>
              ))}
              {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No fittings match.</div>}
            </div>
          </div>

          {/* Selected */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Selected fittings for this section</div>
            <div className="max-h-96 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {local.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Click a fitting on the left to add it.</div>}
              {local.map((f) => (
                <div key={f.id} className="p-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="text-[10px] text-muted-foreground">{f.code} · K base = {f.k}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Qty</span>
                    <Input type="number" className="h-7 w-14 numeric text-right" value={f.qty}
                      onChange={(e) => setLocal(local.map((x) => x.id === f.id ? { ...x, qty: Math.max(0, Number(e.target.value) || 0) } : x))} />
                    <span className="text-[10px] text-muted-foreground ml-1">K</span>
                    <Input type="number" step="0.01" className="h-7 w-16 numeric text-right"
                      placeholder={String(f.k)} value={f.overrideK ?? ""}
                      onChange={(e) => setLocal(local.map((x) => x.id === f.id ? { ...x, overrideK: e.target.value === "" ? undefined : Number(e.target.value) } : x))} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive"
                      onClick={() => setLocal(local.filter((x) => x.id !== f.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Sum of K × Qty</span>
              <span className="numeric font-semibold">{fmt(totalK, 2)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { onChange(local); setOpen(false); toast.success("Fittings updated"); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
