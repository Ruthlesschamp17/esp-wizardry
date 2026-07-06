// Reference K-value catalogue. Values are typical ASHRAE Duct Fitting Database
// / SMACNA values for common HVAC fittings and are user-overridable.

export interface FittingDef {
  code: string;
  name: string;
  category: string;
  k: number;
  ref?: string;
}

export const FITTING_CATEGORIES = [
  "Elbows",
  "Reducers",
  "Transitions",
  "Tees & Wyes",
  "Dampers",
  "Flexible",
  "Canvas & Connections",
  "Silencers",
  "Entries",
  "Exits",
] as const;

export const FITTINGS: FittingDef[] = [
  // Elbows
  { code: "ELB-90-SR",   name: "90° Smooth Radius Elbow (R/D=1.5)", category: "Elbows", k: 0.22, ref: "ASHRAE CD3-9" },
  { code: "ELB-90-SR10", name: "90° Smooth Radius Elbow (R/D=1.0)", category: "Elbows", k: 0.33, ref: "ASHRAE CD3-9" },
  { code: "ELB-90-MIT",  name: "90° Mitered Elbow (no vanes)",       category: "Elbows", k: 1.20, ref: "ASHRAE CD3-1" },
  { code: "ELB-90-VAN",  name: "90° Mitered Elbow (single vanes)",   category: "Elbows", k: 0.35, ref: "ASHRAE CD3-6" },
  { code: "ELB-45-SR",   name: "45° Smooth Radius Elbow",             category: "Elbows", k: 0.10, ref: "ASHRAE CD3-9" },
  { code: "ELB-90-RND",  name: "90° Round Elbow (5-piece)",           category: "Elbows", k: 0.22, ref: "ASHRAE CR3-1" },

  // Reducers
  { code: "RED-GRAD",    name: "Gradual Reducer (≤30°)",              category: "Reducers", k: 0.05 },
  { code: "RED-ABR",     name: "Abrupt Reducer",                       category: "Reducers", k: 0.40 },
  { code: "EXP-GRAD",    name: "Gradual Expansion (≤20°)",            category: "Reducers", k: 0.15 },
  { code: "EXP-ABR",     name: "Abrupt Expansion",                     category: "Reducers", k: 0.80 },

  // Transitions
  { code: "TRN-RR",      name: "Round → Rectangular Transition",       category: "Transitions", k: 0.15 },
  { code: "TRN-RC",      name: "Rectangular → Round Transition",       category: "Transitions", k: 0.10 },

  // Tees & Wyes (branch losses referenced to branch Vp)
  { code: "TEE-STR",     name: "Tee — Straight-Through",               category: "Tees & Wyes", k: 0.20 },
  { code: "TEE-BR",      name: "Tee — Branch (90°)",                   category: "Tees & Wyes", k: 1.00 },
  { code: "WYE-45",      name: "Wye — 45° Branch",                     category: "Tees & Wyes", k: 0.50 },
  { code: "CROSS",       name: "Cross Fitting",                        category: "Tees & Wyes", k: 1.20 },

  // Dampers
  { code: "DMP-VCD",     name: "Volume Control Damper (open)",         category: "Dampers", k: 0.19 },
  { code: "DMP-BAL",     name: "Balancing Damper (partly closed)",     category: "Dampers", k: 1.50 },
  { code: "DMP-FD",      name: "Fire Damper (open)",                   category: "Dampers", k: 0.30 },
  { code: "DMP-BD",      name: "Backdraft Damper",                     category: "Dampers", k: 0.50 },

  // Flexible
  { code: "FLX-STR",     name: "Flex Duct — Straight (per m factor)",  category: "Flexible", k: 0.30 },
  { code: "FLX-90",      name: "Flex Duct — 90° Bend",                 category: "Flexible", k: 0.90 },

  // Canvas & Connections
  { code: "CNV-CONN",    name: "Canvas / Flexible Connection",          category: "Canvas & Connections", k: 0.10 },
  { code: "PLENUM",      name: "Plenum Connection",                     category: "Canvas & Connections", k: 0.25 },

  // Silencers
  { code: "SIL-STD",     name: "Sound Attenuator (standard)",           category: "Silencers", k: 2.50 },
  { code: "SIL-HP",      name: "Sound Attenuator (high performance)",   category: "Silencers", k: 3.50 },

  // Entries
  { code: "ENT-SHRP",    name: "Sharp-Edged Entry",                     category: "Entries", k: 0.50 },
  { code: "ENT-RND",     name: "Rounded Entry (r/D≥0.15)",              category: "Entries", k: 0.05 },
  { code: "ENT-BELL",    name: "Bellmouth Entry",                        category: "Entries", k: 0.03 },

  // Exits
  { code: "EXT-ABR",     name: "Abrupt Exit to Space",                  category: "Exits", k: 1.00 },
  { code: "EXT-CAP",     name: "Capped Discharge",                      category: "Exits", k: 1.20 },
];

export function findFitting(code: string): FittingDef | undefined {
  return FITTINGS.find((f) => f.code === code);
}
