import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { CalcResult, EspProject } from "./types";
import { MATERIAL_LABEL } from "./physics";
import { TERMINAL_LABEL } from "./defaults";

const fmt = (n: number, d = 1) =>
  Number.isFinite(n) ? n.toFixed(d).replace(/\.?0+$/, (m) => (m.includes(".") ? "" : m)) : "—";

export function exportPdf(project: EspProject, result: CalcResult) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  // Header band
  doc.setFillColor(30, 34, 45);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(245, 180, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Intel Air ESP Pro", M, 32);
  doc.setTextColor(230, 230, 235);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("External Static Pressure Calculation Report", M, 50);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), W - M, 32, { align: "right" });
  doc.setTextColor(20, 20, 20);
  y = 90;

  // Project info block
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Project Information", M, y);
  y += 8;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [40, 46, 60], textColor: 255 },
    body: [
      ["Project", project.meta.name, "Client", project.meta.client || "—"],
      ["Consultant", project.meta.consultant || "—", "Engineer", project.meta.engineer || "—"],
      ["Project #", project.meta.projectNumber || "—", "AHU Tag", project.meta.ahuTag || "—"],
      ["Location", project.meta.location || "—", "Altitude (m)", String(project.meta.altitude)],
      ["Safety Factor", `${((project.meta.safetyFactor - 1) * 100).toFixed(0)} %`, "Units", project.meta.units],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // ESP breakdown
  doc.setFont("helvetica", "bold");
  doc.text("External Static Pressure Breakdown (Pa)", M, y);
  y += 4;
  autoTable(doc, {
    startY: y + 4,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [245, 180, 80], textColor: 30 },
    head: [["Component", "Pressure Loss (Pa)"]],
    body: [
      ["External Components Loss", fmt(result.ahuInternalLoss, 0)],
      ["Supply Duct Loss", fmt(result.supplyLoss, 1)],
      ["Return Duct Loss", fmt(result.returnLoss, 1)],
      ["Fresh Air Loss", fmt(result.freshLoss, 1)],
      ["Exhaust Loss", fmt(result.exhaustLoss, 1)],
      ["Fittings (incl. in ducts)", fmt(result.fittingsLossTotal, 1)],
      ["Terminal Loss", fmt(result.terminalLoss, 0)],
      ["Subtotal", fmt(result.subtotalPa, 1)],
      [`Safety Factor (+${((project.meta.safetyFactor - 1) * 100).toFixed(0)} %)`, fmt(result.safetyAddedPa, 1)],
      [{ content: "EXTERNAL STATIC PRESSURE", styles: { fontStyle: "bold" } },
       { content: `${fmt(result.totalEspPa, 0)} Pa`, styles: { fontStyle: "bold" } }],
      ["ESP (mmWG)", `${fmt(result.totalEspPa / 9.80665, 1)} mmWG`],
      ["ESP (in.w.g.)", `${fmt(result.totalEspPa / 249.089, 3)} in.w.g.`],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Duct schedule
  doc.setFont("helvetica", "bold");
  doc.text("Duct Schedule", M, y);
  y += 4;
  autoTable(doc, {
    startY: y + 4,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 46, 60], textColor: 255 },
    head: [["Sec", "Type", "Q L/s", "Shape", "Size mm", "L m", "Material", "V m/s", "Dh m", "Re", "f", "ΔP/m", "Total Pa"]],
    body: result.segments.map((r) => {
      const seg = project.segments.find((s) => s.id === r.id)!;
      const size = seg.shape === "round" ? `Ø${seg.diameter}` : `${seg.width}×${seg.height}`;
      return [
        r.section, r.kind, fmt(seg.airflow, 0), seg.shape, size, fmt(seg.length, 1),
        MATERIAL_LABEL[seg.material], fmt(r.velocityMs, 2), fmt(r.hydraulicDiameterM, 3),
        fmt(r.reynolds, 0), fmt(r.frictionFactor, 4),
        fmt(r.frictionPerMPa, 2), fmt(r.totalLossPa, 1),
      ];
    }),
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  if (y > 720) { doc.addPage(); y = M; }
  doc.setFont("helvetica", "bold");
  doc.text("Engineering Summary", M, y);
  y += 4;
  autoTable(doc, {
    startY: y + 4,
    theme: "plain",
    styles: { fontSize: 9 },
    body: [
      ["Air density (kg/m³)", fmt(result.airDensity, 4)],
      ["Dynamic viscosity (Pa·s)", result.dynamicViscosity.toExponential(3)],
      ["Critical path", result.criticalPath.join(" → ")],
      ["Terminal", TERMINAL_LABEL[project.terminal.kind]],
      ["Status", result.engineeringStatus.toUpperCase()],
      ["Air balance", result.airBalance.ok ? "OK" : `Δ ${result.airBalance.supplyReturnDeltaPct.toFixed(1)}%`],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  if (result.warnings.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Recommendations & Warnings", M, y);
    autoTable(doc, {
      startY: y + 4,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [40, 46, 60], textColor: 255 },
      head: [["Level", "Message", "Recommendation"]],
      body: result.warnings.map((w) => [w.level.toUpperCase(), w.message, w.recommendation ?? "—"]),
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Intel Air ESP Pro • ${project.meta.name} • Page ${i}/${pages}`,
      W / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" },
    );
  }

  doc.save(`${project.meta.name.replace(/\s+/g, "_")}_ESP_Report.pdf`);
}

export function exportExcel(project: EspProject, result: CalcResult) {
  const wb = XLSX.utils.book_new();

  const info = [
    ["Intel Air ESP Pro — ESP Calculation"],
    [],
    ["Project", project.meta.name],
    ["Client", project.meta.client],
    ["Consultant", project.meta.consultant],
    ["Engineer", project.meta.engineer],
    ["Project #", project.meta.projectNumber],
    ["AHU Tag", project.meta.ahuTag],
    ["Location", project.meta.location],
    ["Altitude (m)", project.meta.altitude],
    ["Units", project.meta.units],
    ["Safety Factor", project.meta.safetyFactor],
    ["Date", new Date().toISOString()],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), "Project");

  const breakdown = [
    ["Component", "Pressure Loss (Pa)"],
    ["Internal AHU", result.ahuInternalLoss],
    ["Supply Ducts", result.supplyLoss],
    ["Return Ducts", result.returnLoss],
    ["Fresh Air", result.freshLoss],
    ["Exhaust", result.exhaustLoss],
    ["Fittings (in ducts)", result.fittingsLossTotal],
    ["Terminal", result.terminalLoss],
    ["Subtotal", result.subtotalPa],
    ["Safety Added", result.safetyAddedPa],
    ["TOTAL ESP", result.totalEspPa],
    ["Recommended Fan Static", result.recommendedFanStaticPa],
    ["Fan Type", result.recommendedFanType],
    ["Motor (kW)", result.recommendedMotorKW],
    ["Air Density (kg/m³)", result.airDensity],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(breakdown), "ESP");

  const duct = [
    ["Section", "Type", "Q L/s", "Shape", "W", "H", "Ø", "L m", "Material",
     "V m/s", "A m²", "Dh m", "De m", "Re", "ε/D", "f", "Vp Pa", "ΔP/m", "Straight Pa", "Fittings Pa", "Total Pa"],
  ];
  result.segments.forEach((r) => {
    const seg = project.segments.find((s) => s.id === r.id)!;
    duct.push([
      r.section, r.kind, seg.airflow, seg.shape, seg.width, seg.height, seg.diameter,
      seg.length, MATERIAL_LABEL[seg.material],
      r.velocityMs, r.areaM2, r.hydraulicDiameterM, r.equivalentDiameterM,
      r.reynolds, r.relativeRoughness, r.frictionFactor,
      r.velocityPressurePa, r.frictionPerMPa,
      r.straightLossPa, r.fittingLossPa, r.totalLossPa,
    ] as any);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(duct), "Ducts");

  const ahu = [["AHU Component", "Enabled", "Pressure Drop (Pa)"]];
  project.ahuComponents.forEach((c) => ahu.push([c.name, c.enabled ? "Yes" : "No", c.pressureDrop] as any));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ahu), "AHU");

  const warn = [["Level", "Message", "Recommendation"]];
  result.warnings.forEach((w) => warn.push([w.level, w.message, w.recommendation ?? ""]));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(warn), "Warnings");

  XLSX.writeFile(wb, `${project.meta.name.replace(/\s+/g, "_")}_ESP_Report.xlsx`);
}
