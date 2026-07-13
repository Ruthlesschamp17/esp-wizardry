import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjects } from "@/lib/esp/store";
import { calculate } from "@/lib/esp/calculator";
import { exportPdf, exportExcel } from "@/lib/esp/export";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { MATERIAL_LABEL } from "@/lib/esp/physics";
import { TERMINAL_LABEL } from "@/lib/esp/defaults";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Report — Intel Air ESP Pro" },
      { name: "description", content: "Professional ESP calculation report — PDF and Excel export." },
    ],
  }),
  component: Report,
});

const fmt = (n: number, d = 1) => Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "—";

function Report() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const project = useProjects((s) => s.projects[id]);
  if (!project) return <div className="p-10 text-center text-muted-foreground">Project not found.</div>;
  const result = useMemo(() => calculate(project), [project]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="Report Preview" right={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav({ to: "/workspace/$id", params: { id } })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Workspace
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportExcel(project, result)}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button size="sm" onClick={() => exportPdf(project, result)}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      } />
      <main className="mx-auto max-w-4xl p-8 print:p-0">
        <div className="panel p-8 print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border pb-5">
            <div>
              <div className="text-primary text-2xl font-bold tracking-tight">Intel Air ESP Pro</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">External Static Pressure Calculation Report</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>{new Date().toLocaleDateString()}</div>
              <div className="mt-1">Rev. 1.0</div>
            </div>
          </div>

          {/* Project block */}
          <section className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Field label="Project" value={project.meta.name} />
            <Field label="Client" value={project.meta.client} />
            <Field label="Consultant" value={project.meta.consultant} />
            <Field label="Engineer" value={project.meta.engineer} />
            <Field label="Project #" value={project.meta.projectNumber} />
            <Field label="AHU Tag" value={project.meta.ahuTag} />
            <Field label="Location" value={project.meta.location} />
            <Field label="Altitude" value={`${project.meta.altitude} m`} />
          </section>

          {/* ESP Summary */}
          <section className="mt-8 grid grid-cols-3 gap-4">
            <SumCard label="External Static Pressure" value={`${fmt(result.totalEspPa, 0)} Pa`} big />
            <SumCard label="ESP (mmWG)" value={`${fmt(result.totalEspPa / 9.80665, 1)} mmWG`} />
            <SumCard label="ESP (in.w.g.)" value={`${fmt(result.totalEspPa / 249.089, 3)} in.w.g.`} />
          </section>

          <section className="mt-6">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Pressure Breakdown</h3>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["External Components Loss", result.ahuInternalLoss],
                    ["Supply Duct Loss", result.supplyLoss],
                    ["Return Duct Loss", result.returnLoss],
                    ["Fresh Air Loss", result.freshLoss],
                    ["Exhaust Loss", result.exhaustLoss],
                    ["Fittings (incl. in ducts)", result.fittingsLossTotal],
                    ["Terminal Loss", result.terminalLoss],
                    ["Subtotal", result.subtotalPa],
                    [`Safety Factor (+${((project.meta.safetyFactor - 1) * 100).toFixed(0)} %)`, result.safetyAddedPa],
                  ].map(([label, val]) => (
                    <tr key={label as string} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{label}</td>
                      <td className="px-3 py-2 numeric text-right">{fmt(val as number, 1)} Pa</td>
                    </tr>
                  ))}
                  <tr className="bg-primary/10">
                    <td className="px-3 py-2 font-semibold">EXTERNAL STATIC PRESSURE</td>
                    <td className="px-3 py-2 numeric text-right font-bold text-primary">{fmt(result.totalEspPa, 0)} Pa</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              ESP excludes fan, coil, internal AHU filter, mixing box and drain pan losses — those are computed by the AHU manufacturer as Total Static Pressure.
            </p>
          </section>

          <section className="mt-6">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Critical Path</h3>
            <div className="flex flex-wrap gap-1 text-xs">
              {result.criticalPath.map((s, i) => (
                <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-secondary font-medium">
                  {s}{i < result.criticalPath.length - 1 && <ChevronsRight className="h-3 w-3 mx-1 opacity-50" />}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Duct Schedule</h3>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-xs numeric">
                <thead className="bg-secondary text-secondary-foreground">
                  <tr>
                    {["Sec", "Type", "Q L/s", "Size mm", "L m", "Material", "V m/s", "ΔP/m Pa", "Total Pa"].map((h) =>
                      <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.segments.map((r) => {
                    const seg = project.segments.find((s) => s.id === r.id)!;
                    const size = seg.shape === "round" ? `Ø${seg.diameter}` : `${seg.width}×${seg.height}`;
                    return (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-2 py-1">{r.section}</td>
                        <td className="px-2 py-1">{r.kind}</td>
                        <td className="px-2 py-1">{fmt(seg.airflow, 0)}</td>
                        <td className="px-2 py-1">{size}</td>
                        <td className="px-2 py-1">{fmt(seg.length, 1)}</td>
                        <td className="px-2 py-1">{MATERIAL_LABEL[seg.material]}</td>
                        <td className="px-2 py-1">{fmt(r.velocityMs, 2)}</td>
                        <td className="px-2 py-1">{fmt(r.frictionPerMPa, 2)}</td>
                        <td className="px-2 py-1 font-semibold">{fmt(r.totalLossPa, 1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Engineering Summary</div>
              <div className="space-y-1 text-xs">
                <Line label="Air density" value={`${fmt(result.airDensity, 4)} kg/m³`} />
                <Line label="Dyn. viscosity" value={result.dynamicViscosity.toExponential(3) + " Pa·s"} />
                <Line label="Terminal" value={TERMINAL_LABEL[project.terminal.kind]} />
                <Line label="Safety factor" value={`+${((project.meta.safetyFactor - 1) * 100).toFixed(0)} %`} />
                <Line label="Status" value={result.engineeringStatus.toUpperCase()} />
                <Line label="Air balance" value={result.airBalance.ok ? "OK" : `Δ ${result.airBalance.supplyReturnDeltaPct.toFixed(1)}%`} />
              </div>
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Assumptions</div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Colebrook–White friction factor (Serghides)</li>
                <li>Darcy–Weisbach straight-duct loss</li>
                <li>Huebscher equivalent circular diameter</li>
                <li>Air density from altitude and mean air temperature</li>
                <li>Fitting losses computed on local Vp</li>
                <li>Safety factor applied to entire subtotal</li>
              </ul>
            </div>
          </section>

          {result.warnings.length > 0 && (
            <section className="mt-6">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Recommendations & Warnings</h3>
              <div className="space-y-2">
                {result.warnings.map((w, i) => (
                  <div key={i} className="rounded-md border border-border p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={w.level === "critical" ? "destructive" : "secondary"}>{w.level.toUpperCase()}</Badge>
                      <span className="font-medium">{w.message}</span>
                    </div>
                    {w.recommendation && <div className="mt-1 text-muted-foreground">{w.recommendation}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground flex justify-between">
            <span>Intel Air ESP Pro · {project.meta.name}</span>
            <span>Generated {new Date().toLocaleString()}</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
function SumCard({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 numeric font-semibold ${big ? "text-3xl text-primary" : "text-xl"}`}>{value}</div>
    </div>
  );
}
function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
