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

/**
 * First-run defaults so the control page (and the dashboard pump card) is not
 * empty before the user has added anything. Seeded only when there is nothing
 * in storage yet; once the user edits, their data is what persists.
 */
export const DEFAULT_VANNES_POMPES: VannesPompesStored = {
  vanes: [
    {
      id: 'vane-seed-1',
      name: 'Vanne générale',
      devEui: '00124A0007B4F1A1',
      active: false,
    },
    {
      id: 'vane-seed-2',
      name: 'Vanne zone 1',
      devEui: '00124A0007B4F1B2',
      active: true,
    },
  ],
  pumps: [
    { id: 'pump-seed-1', name: 'Pompe principale', running: false },
    { id: 'pump-seed-2', name: 'Pompe de secours', running: false },
  ],
};

export function loadVannesPompesFromStorage(): VannesPompesStored {
  if (typeof window === 'undefined') return { vanes: [], pumps: [] };
  try {
    const raw = localStorage.getItem(VANNES_POMPES_STORAGE_KEY);
    if (!raw) {
      const seeded = {
        vanes: [...DEFAULT_VANNES_POMPES.vanes],
        pumps: [...DEFAULT_VANNES_POMPES.pumps],
      };
      localStorage.setItem(VANNES_POMPES_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
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
