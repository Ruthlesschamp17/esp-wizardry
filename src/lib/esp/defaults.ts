import type { AhuComponent, EspProject, Terminal, TerminalKind } from "./types";

export const TERMINAL_LABEL: Record<TerminalKind, string> = {
  "supply-diffuser": "Supply Diffuser",
  "linear-slot": "Linear Slot Diffuser",
  "jet-nozzle": "Jet / Nozzle Diffuser",
  "swirl": "Swirl Diffuser",
  "eggcrate-return": "Eggcrate Return",
  "return-grille": "Return Grille",
  "exhaust-grille": "Exhaust Grille",
  "weather-louver": "Weather Louver",
};

export const TERMINAL_DEFAULT_PA: Record<TerminalKind, number> = {
  "supply-diffuser": 25,
  "linear-slot": 30,
  "jet-nozzle": 40,
  "swirl": 35,
  "eggcrate-return": 15,
  "return-grille": 20,
  "exhaust-grille": 20,
  "weather-louver": 50,
};

export function defaultAhuComponents(): AhuComponent[] {
  const rows: Array<[string, number, boolean]> = [
    ["Pre Filter (G4) — final ΔP", 150, true],
    ["Fine Filter (F7) — final ΔP", 250, true],
    ["HEPA Filter — final ΔP", 500, false],
    ["Cooling Coil (wet)", 200, true],
    ["Heating Coil", 80, true],
    ["Fire Damper", 15, false],
    ["Smoke Damper", 20, false],
    ["Mixing Box", 25, true],
    ["Drain Pan", 5, true],
    ["UV Lamp Section", 15, false],
    ["Humidifier", 40, false],
    ["Heat Recovery (Plate/Wheel)", 150, false],
    ["Sound Attenuator (internal)", 60, false],
    ["Miscellaneous / Access", 25, true],
  ];
  return rows.map(([name, dp, enabled], i) => ({
    id: `ahu-${i}`,
    name,
    enabled,
    pressureDrop: dp,
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
        fittings: [
          { id: "f1", code: "ELB-90-SR", name: "90° Smooth Radius Elbow (R/D=1.5)", category: "Elbows", k: 0.22, qty: 2 },
          { id: "f2", code: "DMP-VCD",  name: "Volume Control Damper (open)",       category: "Dampers", k: 0.19, qty: 1 },
        ],
      },
      {
        id: "seg-2", section: "R1", kind: "return", airflow: 900,
        shape: "rect", width: 550, height: 350, diameter: 450,
        length: 8, material: "galvanized",
        fittings: [
          { id: "f3", code: "ELB-90-SR", name: "90° Smooth Radius Elbow (R/D=1.5)", category: "Elbows", k: 0.22, qty: 1 },
        ],
      },
    ],
    terminal: defaultTerminal(),
    advancedMode: false,
  };
}
