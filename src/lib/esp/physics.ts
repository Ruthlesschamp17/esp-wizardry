// Engineering physics — SI internal. Sources: ASHRAE Fundamentals 2021,
// SMACNA HVAC Duct Design.

import type { MaterialKey, Shape } from "./types";

export const R_AIR = 287.055; // J/(kg·K)
export const G = 9.80665;
export const P0 = 101325;     // Pa at sea level

/** Barometric pressure at altitude (m), ISA. */
export function barometricPressure(altitudeM: number): number {
  const h = Math.max(0, altitudeM);
  return P0 * Math.pow(1 - 2.25577e-5 * h, 5.2559);
}

/** Air density from temperature (°C), altitude (m). Ideal gas, dry air. */
export function airDensity(tempC: number, altitudeM: number): number {
  const T = tempC + 273.15;
  const P = barometricPressure(altitudeM);
  return P / (R_AIR * T);
}

/** Sutherland dynamic viscosity of air, Pa·s. */
export function airViscosity(tempC: number): number {
  const T = tempC + 273.15;
  return (1.458e-6 * Math.pow(T, 1.5)) / (T + 110.4);
}

/** Absolute roughness ε in meters — ASHRAE typical values. */
export const ROUGHNESS_M: Record<MaterialKey, number> = {
  galvanized: 0.00009,
  stainless: 0.00005,
  aluminum: 0.00004,
  "fiberglass-lined": 0.0015,
  "flex-nonmetallic": 0.003,
  "flex-metallic": 0.0012,
  pvc: 0.00003,
};

export const MATERIAL_LABEL: Record<MaterialKey, string> = {
  galvanized: "Galvanized Steel",
  stainless: "Stainless Steel",
  aluminum: "Aluminum",
  "fiberglass-lined": "Fiberglass Lined",
  "flex-nonmetallic": "Flex (Non-metallic)",
  "flex-metallic": "Flex (Metallic)",
  pvc: "PVC",
};

/** Cross-sectional area (m²) for a duct shape. Dimensions in mm. */
export function ductArea(shape: Shape, w: number, h: number, d: number): number {
  if (shape === "round") {
    const D = d / 1000;
    return (Math.PI * D * D) / 4;
  }
  if (shape === "flat-oval") {
    // major w, minor h (mm)
    const a = w / 1000, b = h / 1000;
    return (Math.PI * b * b) / 4 + b * (a - b);
  }
  return (w / 1000) * (h / 1000);
}

/** Hydraulic diameter Dh = 4A/P, meters. */
export function hydraulicDiameter(shape: Shape, w: number, h: number, d: number): number {
  if (shape === "round") return d / 1000;
  if (shape === "flat-oval") {
    const a = w / 1000, b = h / 1000;
    const A = (Math.PI * b * b) / 4 + b * (a - b);
    const P = Math.PI * b + 2 * (a - b);
    return (4 * A) / P;
  }
  const a = w / 1000, b = h / 1000;
  return (2 * a * b) / (a + b);
}

/** Huebscher equivalent circular diameter (m) for rectangular duct. */
export function equivalentDiameter(shape: Shape, w: number, h: number, d: number): number {
  if (shape === "round") return d / 1000;
  const a = w / 1000, b = h / 1000;
  if (shape === "flat-oval") {
    // ASHRAE flat-oval equivalent
    const A = (Math.PI * b * b) / 4 + b * (a - b);
    const P = Math.PI * b + 2 * (a - b);
    return (1.55 * Math.pow(A, 0.625)) / Math.pow(P, 0.25);
  }
  return (1.3 * Math.pow(a * b, 0.625)) / Math.pow(a + b, 0.25);
}

/** Colebrook–White friction factor via Serghides explicit solution. */
export function frictionFactor(reynolds: number, relRoughness: number): number {
  if (reynolds < 2300) {
    // Laminar
    return 64 / Math.max(reynolds, 1);
  }
  const eD = relRoughness;
  const Re = reynolds;
  const A = -2 * Math.log10(eD / 3.7 + 12 / Re);
  const B = -2 * Math.log10(eD / 3.7 + (2.51 * A) / Re);
  const C = -2 * Math.log10(eD / 3.7 + (2.51 * B) / Re);
  const denom = C - 2 * B + A;
  const inv = A - Math.pow(B - A, 2) / (denom === 0 ? 1e-9 : denom);
  return 1 / (inv * inv);
}

/** Velocity pressure Pa. */
export function velocityPressure(rho: number, v: number): number {
  return 0.5 * rho * v * v;
}
