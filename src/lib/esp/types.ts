export type Units = "SI" | "IP";
export type Shape = "rect" | "round" | "flat-oval";
export type SegmentKind = "supply" | "return" | "fresh" | "exhaust";

export interface ProjectMeta {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  client: string;
  consultant: string;
  engineer: string;
  projectNumber: string;
  ahuTag: string;
  location: string;
  altitude: number; // meters
  units: Units;
  safetyFactor: number; // e.g. 1.10
  preparedBy?: string;
  airflowUnit?: "L/s" | "CMH" | "CFM";
}

export interface Airflow {
  supply: number;    // L/s
  return_: number;   // L/s
  fresh: number;     // L/s
  exhaust: number;   // L/s
  supplyTempC: number;
  returnTempC: number;
}

export interface AhuComponent {
  id: string;
  name: string;
  enabled: boolean;
  pressureDrop: number; // Pa
  note?: string;
}

export interface Fitting {
  id: string;
  code: string;      // e.g. "ELB-90-SR"
  name: string;
  category: string;
  k: number;
  qty: number;
  overrideK?: number;
}

export type MaterialKey =
  | "galvanized"
  | "stainless"
  | "aluminum"
  | "fiberglass-lined"
  | "flex-nonmetallic"
  | "flex-metallic"
  | "pvc";

export interface DuctSegment {
  id: string;
  section: string;   // e.g. "S1"
  kind: SegmentKind;
  airflow: number;   // L/s
  shape: Shape;
  width: number;     // mm (rect / flat-oval major)
  height: number;    // mm (rect / flat-oval minor)
  diameter: number;  // mm (round)
  length: number;    // m
  material: MaterialKey;
  fittings: Fitting[];
  isCritical?: boolean;
  remark?: string;
  runId?: string;
}

export type TerminalKind =
  | "supply-diffuser"
  | "supply-grille"
  | "return-grille"
  | "eggcrate-return"
  | "linear-slot"
  | "swirl"
  | "jet-nozzle"
  | "drum-louver"
  | "ceiling-4way"
  | "ceiling-3way"
  | "ceiling-2way"
  | "ceiling-1way"
  | "floor-grille"
  | "door-transfer"
  | "custom"
  | "exhaust-grille"
  | "weather-louver";

export interface Terminal {
  kind: TerminalKind;
  pressureDrop: number; // Pa (editable)
}

export interface EspProject {
  meta: ProjectMeta;
  airflow: Airflow;
  ahuComponents: AhuComponent[];
  segments: DuctSegment[];
  terminal: Terminal;
  advancedMode: boolean;
}

export interface SegmentResult {
  id: string;
  section: string;
  kind: SegmentKind;
  areaM2: number;
  velocityMs: number;
  hydraulicDiameterM: number;
  equivalentDiameterM: number;
  reynolds: number;
  relativeRoughness: number;
  frictionFactor: number;
  velocityPressurePa: number;
  frictionPerMPa: number;
  straightLossPa: number;
  fittingLossPa: number;
  totalLossPa: number;
  warnings: string[];
}

export interface CalcResult {
  airDensity: number;             // kg/m³
  dynamicViscosity: number;       // Pa·s
  ahuInternalLoss: number;        // Pa
  supplyLoss: number;
  returnLoss: number;
  freshLoss: number;
  exhaustLoss: number;
  fittingsLossTotal: number;
  terminalLoss: number;
  subtotalPa: number;             // sum before safety factor
  safetyAddedPa: number;
  totalEspPa: number;             // TESP incl. safety
  recommendedFanStaticPa: number; // adds small margin
  recommendedFanType: string;
  recommendedMotorKW: number;
  criticalPath: string[];         // section labels
  segments: SegmentResult[];
  warnings: EngineWarning[];
  engineeringStatus: "ok" | "review" | "critical";
  airBalance: {
    supply: number; return_: number; fresh: number; exhaust: number;
    supplyReturnDeltaPct: number; ok: boolean;
  };
}

export interface EngineWarning {
  level: "info" | "warn" | "critical";
  code: string;
  message: string;
  recommendation?: string;
  segmentId?: string;
}
