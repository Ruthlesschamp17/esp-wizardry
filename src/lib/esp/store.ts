import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EspProject } from "./types";
import { emptyProject } from "./defaults";

interface State {
  projects: Record<string, EspProject>;
  order: string[]; // most recent first
  createProject: (partial?: Partial<EspProject["meta"]>) => string;
  updateProject: (id: string, updater: (p: EspProject) => EspProject) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => EspProject | undefined;
  touch: (id: string) => void;
}

function makeId() {
  return "p_" + Math.random().toString(36).slice(2, 10);
}

export const useProjects = create<State>()(
  persist(
    (set, get) => ({
      projects: {},
      order: [],
      createProject: (partial) => {
        const id = makeId();
        const proj = emptyProject(id);
        if (partial) proj.meta = { ...proj.meta, ...partial, id };
        set((s) => ({
          projects: { ...s.projects, [id]: proj },
          order: [id, ...s.order],
        }));
        return id;
      },
      updateProject: (id, updater) => set((s) => {
        const existing = s.projects[id];
        if (!existing) return s;
        const next = updater(existing);
        next.meta.updatedAt = Date.now();
        return {
          projects: { ...s.projects, [id]: next },
          order: [id, ...s.order.filter((x) => x !== id)],
        };
      }),
      deleteProject: (id) => set((s) => {
        const { [id]: _, ...rest } = s.projects;
        return { projects: rest, order: s.order.filter((x) => x !== id) };
      }),
      getProject: (id) => get().projects[id],
      touch: (id) => set((s) => ({ order: [id, ...s.order.filter((x) => x !== id)] })),
    }),
    { name: "intel-air-esp-pro-v1" },
  ),
);
