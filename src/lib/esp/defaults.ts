import type { AhuComponent, EspProject, Terminal, TerminalKind } from "./types";

export const TERMINAL_LABEL: Record<TerminalKind, string> = {
  "supply-diffuser": "Supply Diffuser",
  "supply-grille": "Supply Grille",
  "return-grille": "Return Grille",
  "eggcrate-return": "Egg Crate Return Grille",
  "linear-slot": "Linear Slot Diffuser",
  "swirl": "Swirl Diffuser",
  "jet-nozzle": "Jet Nozzle",
  "drum-louver": "Drum Louver",
  "ceiling-4way": "Ceiling Diffuser (4 Way)",
  "ceiling-3way": "Ceiling Diffuser (3 Way)",
  "ceiling-2way": "Ceiling Diffuser (2 Way)",
  "ceiling-1way": "Ceiling Diffuser (1 Way)",
  "floor-grille": "Floor Grille",
  "door-transfer": "Door Transfer Grille",
  "custom": "Custom",
  "exhaust-grille": "Exhaust Grille",
  "weather-louver": "Weather Louver",
};

export const TERMINAL_DEFAULT_PA: Record<TerminalKind, number> = {
  "supply-diffuser": 25,
  "supply-grille": 20,
  "return-grille": 15,
  "eggcrate-return": 10,
  "linear-slot": 30,
  "swirl": 35,
  "jet-nozzle": 50,
  "drum-louver": 40,
  "ceiling-4way": 25,
  "ceiling-3way": 25,
  "ceiling-2way": 25,
  "ceiling-1way": 25,
  "floor-grille": 20,
  "door-transfer": 10,
  "custom": 25,
  "exhaust-grille": 20,
  "weather-louver": 50,
};

// Preset list of common contractor-side external components.
// Users can toggle any of these on/off and edit the pressure drop,
// or add fully custom components. Internal AHU losses (fan, coils,
// internal filters, mixing box, drain pan) are NEVER included here.
export const EXTERNAL_COMPONENT_PRESETS: Array<{ name: string; pa: number }> = [
  { name: "Fire Damper", pa: 25 },
  { name: "Volume Control Damper (VCD)", pa: 20 },
  { name: "Opposed Blade Damper (OBD)", pa: 30 },
  { name: "Back Draft Damper", pa: 25 },
  { name: "Sound Attenuator / Silencer", pa: 60 },
  { name: "Flexible Duct", pa: 15 },
  { name: "Flexible Connector", pa: 10 },
  { name: "Duct Heater", pa: 40 },
  { name: "HEPA Filter (In-Duct)", pa: 500 },
  { name: "Bag Filter (In-Duct)", pa: 150 },
  { name: "Pre Filter (In-Duct)", pa: 80 },
  { name: "UV Section", pa: 15 },
  { name: "VAV Box", pa: 75 },
  { name: "CAV Box", pa: 75 },
];

export function defaultAhuComponents(): AhuComponent[] {
  return EXTERNAL_COMPONENT_PRESETS.map((c, i) => ({
    id: `ext-${i}`,
    name: c.name,
    enabled: false,
    pressureDrop: c.pa,
  }));
}

export function defaultTerminal(): Terminal {
  return { kind: "supply-diffuser", pressureDrop: TERMINAL_DEFAULT_PA["supply-diffuser"] };
}

export function emptyProject(id: string): EspProject {
  const now = Date.now();
  return {
    meta: {
      id,
      createdAt: now,
      updatedAt: now,
      name: "Untitled Project",
      client: "",
      consultant: "",
      engineer: "",
      projectNumber: "",
      ahuTag: "AHU-01",
      location: "",
      altitude: 0,
      units: "SI",
      safetyFactor: 1.10,
      preparedBy: "",
      airflowUnit: "L/s",
    },
    airflow: {
      supply: 1000,
      return_: 900,
      fresh: 100,
      exhaust: 100,
      supplyTempC: 14,
      returnTempC: 24,
    },
    ahuComponents: defaultAhuComponents(),
    segments: [
      {
        id: "seg-1", section: "S1", kind: "supply", airflow: 1000,
        shape: "rect", width: 500, height: 300, diameter: 400,
        length: 10, material: "galvanized",
        remark: "Main Supply", runId: "Run 1",
        fittings: [
          { id: "f1", code: "ELB-90-SR", name: "90° Smooth Radius Elbow (R/D=1.5)", category: "Elbows", k: 0.22, qty: 2 },
          { id: "f2", code: "DMP-VCD",  name: "Volume Control Damper (open)",       category: "Dampers", k: 0.19, qty: 1 },
        ],
      },
      {
        id: "seg-2", section: "R1", kind: "return", airflow: 900,
        shape: "rect", width: 550, height: 350, diameter: 450,
        length: 8, material: "galvanized",
        remark: "Main Return", runId: "Run 1",
        fittings: [
          { id: "f3", code: "ELB-90-SR", name: "90° Smooth Radius Elbow (R/D=1.5)", category: "Elbows", k: 0.22, qty: 1 },
        ],
      },
    ],
    terminal: defaultTerminal(),
    advancedMode: false,
  };
}
