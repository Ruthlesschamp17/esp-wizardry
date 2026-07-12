import type {
  CalcResult, DuctSegment, EspProject, EngineWarning, SegmentResult,
} from "./types";
import {
  ROUGHNESS_M, airDensity, airViscosity, ductArea, equivalentDiameter,
  frictionFactor, hydraulicDiameter, velocityPressure,
} from "./physics";

const LPS_TO_M3S = 1 / 1000;

function calcSegment(
  seg: DuctSegment, rho: number, mu: number,
): SegmentResult {
  const Q = seg.airflow * LPS_TO_M3S; // m³/s
  const A = ductArea(seg.shape, seg.width, seg.height, seg.diameter);
  const V = A > 0 ? Q / A : 0;
  const Dh = hydraulicDiameter(seg.shape, seg.width, seg.height, seg.diameter);
  const De = equivalentDiameter(seg.shape, seg.width, seg.height, seg.diameter);
  const eps = ROUGHNESS_M[seg.material];
  const relRough = Dh > 0 ? eps / Dh : 0;
  const Re = mu > 0 ? (rho * V * Dh) / mu : 0;
  const f = frictionFactor(Re, relRough);
  const Vp = velocityPressure(rho, V);
  const dPperM = Dh > 0 ? (f / Dh) * Vp : 0;
  const straight = dPperM * seg.length;
  const K = seg.fittings.reduce(
    (s, ft) => s + (ft.overrideK ?? ft.k) * ft.qty, 0,
  );
  const fittingLoss = K * Vp;
  const total = straight + fittingLoss;

  const warnings: string[] = [];
  if (V > 12) warnings.push(`Very high velocity (${V.toFixed(1)} m/s)`);
  else if (V > 8 && seg.kind === "supply") warnings.push(`High velocity (${V.toFixed(1)} m/s)`);
  else if (V < 2 && Q > 0.1) warnings.push(`Low velocity (${V.toFixed(1)} m/s) — oversized duct`);
  if (dPperM > 2.5) warnings.push(`High friction (${dPperM.toFixed(2)} Pa/m)`);
  if (seg.material.startsWith("flex") && seg.length > 3)
    warnings.push(`Long flexible duct (${seg.length.toFixed(1)} m) — keep ≤ 3 m`);

  return {
    id: seg.id, section: seg.section, kind: seg.kind,
    areaM2: A, velocityMs: V, hydraulicDiameterM: Dh, equivalentDiameterM: De,
    reynolds: Re, relativeRoughness: relRough, frictionFactor: f,
    velocityPressurePa: Vp, frictionPerMPa: dPperM,
    straightLossPa: straight, fittingLossPa: fittingLoss, totalLossPa: total,
    warnings,
  };
}


export function calculate(p: EspProject): CalcResult {
  const rho = airDensity((p.airflow.supplyTempC + p.airflow.returnTempC) / 2, p.meta.altitude);
  const mu = airViscosity((p.airflow.supplyTempC + p.airflow.returnTempC) / 2);

  const segResults = p.segments.map((s) => calcSegment(s, rho, mu));

  const bucket = (kind: SegmentResult["kind"]) =>
    segResults.filter((r) => r.kind === kind).reduce((s, r) => s + r.totalLossPa, 0);

  const supplyLoss = bucket("supply");
  const returnLoss = bucket("return");
  const freshLoss = bucket("fresh");
  const exhaustLoss = bucket("exhaust");

  const ahuInternalLoss = p.ahuComponents
    .filter((c) => c.enabled).reduce((s, c) => s + c.pressureDrop, 0);

  const fittingsLossTotal = segResults.reduce((s, r) => s + r.fittingLossPa, 0);
  const terminalLoss = p.terminal.pressureDrop;

  // ESP model: AHU internal + supply-side external + return-side external + terminal
  const subtotal =
    ahuInternalLoss + supplyLoss + returnLoss + freshLoss + exhaustLoss + terminalLoss;

  const safetyAdded = subtotal * (p.meta.safetyFactor - 1);
  const totalEsp = subtotal + safetyAdded;
  const recommendedFanStatic = totalEsp * 1.05;

  // Critical path: greatest single-side (supply chain) + return chain
  const supplyPath = segResults
    .filter((r) => r.kind === "supply")
    .sort((a, b) => b.totalLossPa - a.totalLossPa)
    .map((r) => r.section);
  const returnPath = segResults
    .filter((r) => r.kind === "return")
    .sort((a, b) => b.totalLossPa - a.totalLossPa)
    .map((r) => r.section);
  const criticalPath = ["AHU", ...supplyPath, "Terminal", ...returnPath];

  // Fan sizing driven by supply airflow
  const rec = recommendFan(recommendedFanStatic, p.airflow.supply);

  // Warnings
  const warnings: EngineWarning[] = [];
  segResults.forEach((r) => r.warnings.forEach((w) => warnings.push({
    level: w.startsWith("Very") ? "critical" : "warn",
    code: "SEG",
    message: `${r.section}: ${w}`,
    segmentId: r.id,
    recommendation: w.includes("velocity") && w.startsWith("Very")
      ? `Increase cross-section on ${r.section} to reduce velocity.` : undefined,
  })));

  // Air balance
  const bal = {
    supply: p.airflow.supply, return_: p.airflow.return_,
    fresh: p.airflow.fresh, exhaust: p.airflow.exhaust,
    supplyReturnDeltaPct: p.airflow.supply === 0 ? 0
      : ((p.airflow.supply - p.airflow.return_ - p.airflow.exhaust + p.airflow.fresh)
         / p.airflow.supply) * 100,
    ok: false,
  };
  bal.ok = Math.abs(bal.supplyReturnDeltaPct) < 10;
  if (!bal.ok) {
    warnings.push({
      level: "warn", code: "BAL",
      message: `Airflow imbalance ${bal.supplyReturnDeltaPct.toFixed(1)}%`,
      recommendation: "Adjust return, fresh air or exhaust to balance the AHU.",
    });
  }
  if (totalEsp > 1500) warnings.push({
    level: "critical", code: "ESP-HIGH",
    message: `Very high ESP (${totalEsp.toFixed(0)} Pa)`,
    recommendation: "Review duct sizing, fitting count, and filter selection.",
  });
  if (totalEsp < 150 && subtotal > 0) warnings.push({
    level: "info", code: "ESP-LOW",
    message: `Unusually low ESP (${totalEsp.toFixed(0)} Pa)`,
    recommendation: "Verify all AHU components and duct sections are included.",
  });
  const totalFilter = p.ahuComponents
    .filter((c) => c.enabled && /filter/i.test(c.name))
    .reduce((s, c) => s + c.pressureDrop, 0);
  if (totalFilter > 700) warnings.push({
    level: "warn", code: "FILT-HIGH",
    message: `High combined filter loss (${totalFilter.toFixed(0)} Pa)`,
    recommendation: "Confirm filters are sized on final (dirty) ΔP; consider larger media area.",
  });

  const status: CalcResult["engineeringStatus"] =
    warnings.some((w) => w.level === "critical") ? "critical"
      : warnings.some((w) => w.level === "warn") ? "review" : "ok";

  return {
    airDensity: rho, dynamicViscosity: mu,
    ahuInternalLoss, supplyLoss, returnLoss, freshLoss, exhaustLoss,
    fittingsLossTotal, terminalLoss,
    subtotalPa: subtotal, safetyAddedPa: safetyAdded, totalEspPa: totalEsp,
    recommendedFanStaticPa: recommendedFanStatic,
    recommendedFanType: rec.type, recommendedMotorKW: rec.kw,
    criticalPath, segments: segResults, warnings,
    engineeringStatus: status, airBalance: bal,
  };
}
