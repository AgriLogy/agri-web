export const VANNES_POMPES_STORAGE_KEY = 'agrilogy-vannes-pompes-v1';

export const VANNES_POMPES_UPDATED_EVENT = 'vannes-pompes-updated';

export type Vane = {
  id: string;
  name: string;
  devEui: string;
  active: boolean;
};

export type Pump = {
  id: string;
  name: string;
  running: boolean;
};

export type VannesPompesStored = { vanes: Vane[]; pumps: Pump[] };

export function loadVannesPompesFromStorage(): VannesPompesStored {
  if (typeof window === 'undefined') return { vanes: [], pumps: [] };
  try {
    const raw = localStorage.getItem(VANNES_POMPES_STORAGE_KEY);
    if (!raw) return { vanes: [], pumps: [] };
    const parsed = JSON.parse(raw) as Partial<VannesPompesStored>;
    return {
      vanes: Array.isArray(parsed.vanes) ? parsed.vanes : [],
      pumps: Array.isArray(parsed.pumps) ? parsed.pumps : [],
    };
  } catch {
    return { vanes: [], pumps: [] };
  }
}

export function dispatchVannesPompesUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VANNES_POMPES_UPDATED_EVENT));
}
