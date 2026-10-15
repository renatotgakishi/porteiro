import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
}
export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (v) => set({ collapsed: v }),
      toggle: () => set((s) => ({ collapsed:!s.collapsed })),
    }),
    { name: 'porteiro-sidebar' }
  )
);