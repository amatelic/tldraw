import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DevToolState {
  isOpen: boolean;
  overrides: Record<string, string>;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setOverride: (key: string, value: string) => void;
  resetOverrides: () => void;
  exportCSS: () => string;
}

export const useDevToolStore = create<DevToolState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      overrides: {},
      setOpen: (open) => set({ isOpen: open }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      setOverride: (key, value) =>
        set((state) => ({
          overrides: { ...state.overrides, [key]: value },
        })),
      resetOverrides: () => set({ overrides: {} }),
      exportCSS: () => {
        const { overrides } = get();
        return Object.entries(overrides)
          .map(([key, value]) => `  ${key}: ${value};`)
          .join('\n');
      },
    }),
    {
      name: 'dev-tool-overrides',
    }
  )
);
