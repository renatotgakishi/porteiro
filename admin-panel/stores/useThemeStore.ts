"use client"
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserMode = 'light' | 'dark' | 'system';
export type ThemeStyle = 'flat' | 'glass' | 'neumorphism';
export type BgType = 'solid' | 'gradient' | 'image';
export type Density = 'compact' | 'comfortable';
export type ThemeStatus = 'draft' | 'published';

export interface ThemeColors {
  bg: string; bgCard: string; bgMuted: string; border: string;
  text: string; textMuted: string; primary: string; primaryForeground: string;
}
export interface ThemeBackground {
  type: BgType; solid?: string;
  gradient?: { from: string; to: string; dir: string };
  image?: { url: string };
}
export interface ThemeDefinition {
  id: string; name: string; slug: string; style: ThemeStyle;
  colorsLight: ThemeColors; colorsDark: ThemeColors;
  backgroundLight: ThemeBackground; backgroundDark: ThemeBackground;
  glassConfig?: { opacityLight: number; opacityDark: number; blur: number; saturate: number };
  neumorphConfig?: { intensity: number; inset: boolean };
  shadows?: { card: string; float: string };
  radius?: { card: number; button: number; input: number };
  typography?: { fontFamily: string };
  density: Density; status: ThemeStatus; dateAt: string;
}

const defaultLight: ThemeColors = {
  bg: '30 20% 97.5%', bgCard: '0 0% 100%', bgMuted: '30 12% 92%',
  border: '30 10% 85%', text: '30 12% 12%', textMuted: '30 6% 45%',
  primary: '24 95% 53%', primaryForeground: '0 0% 98%',
};
const defaultDark: ThemeColors = {
  bg: '24 10% 4%', bgCard: '30 8% 8%', bgMuted: '30 6% 14%',
  border: '30 6% 18%', text: '30 8% 95%', textMuted: '30 5% 55%',
  primary: '24 95% 53%', primaryForeground: '30 10% 15%',
};

export const argilaTheme: ThemeDefinition = {
  id: 'porteiro-argila', name: 'Porteiro • Argila', slug: 'porteiro-argila',
  style: 'glass', density: 'comfortable', status: 'published', dateAt: new Date().toISOString(),
  colorsLight: { bg: '30 33% 97%', bgCard: '0 0% 100%', bgMuted: '30 15% 94%', border: '30 10% 88%', text: '20 10% 10%', textMuted: '25 5% 47%', primary: '22 90% 48%', primaryForeground: '0 0% 98%' },
  colorsDark: { bg: '20 10% 4%', bgCard: '20 8% 10%', bgMuted: '20 6% 15%', border: '20 6% 16%', text: '30 10% 97%', textMuted: '25 5% 64%', primary: '24 95% 60%', primaryForeground: '20 10% 4%' },
  backgroundLight: { type: 'gradient', gradient: { from: '#f5e6d8', to: '#fdf8f4', dir: '135deg' } },
  backgroundDark: { type: 'gradient', gradient: { from: '#2a1a3a', to: '#1c1917', dir: '135deg' } },
  glassConfig: { opacityLight: 68, opacityDark: 38, blur: 24, saturate: 180 },
  neumorphConfig: { intensity: 1, inset: false },
  shadows: { card: '0 4px 24px rgba(28,25,23,0.96)', float: '0 46px 48px rgba(28,25,23,0.92)' },
  radius: { card: 16, button: 10, input: 12 },
  typography: { fontFamily: 'Inter' },
};

export const defaultTheme: ThemeDefinition = {
  id: 'default', name: 'Padrão Porteiro', slug: 'padrao-porteiro', style: 'flat',
  colorsLight: defaultLight, colorsDark: defaultDark,
  backgroundLight: { type: 'solid' }, backgroundDark: { type: 'solid' },
  glassConfig: { opacityLight: 68, opacityDark: 38, blur: 24, saturate: 180 },
  neumorphConfig: { intensity: 1, inset: false },
  shadows: { card: '0 1px 3px 0 rgb(0 0 0 / 0.05)', float: '0 10px 30px -10px rgb(0 0 0 / 0.2)' },
  radius: { card: 16, button: 12, input: 12 },
  typography: { fontFamily: 'Inter' },
  density: 'comfortable', status: 'published', dateAt: new Date().toISOString(),
};

export const defaultThemes: ThemeDefinition[] = [defaultTheme, argilaTheme];

interface ThemeStore {
  themes: ThemeDefinition[]; activeThemeId: string; userMode: UserMode; hasHydratedFromBackend: boolean;
  setUserMode: (mode: UserMode) => void; setActiveThemeId: (id: string) => void;
  saveTheme: (theme: ThemeDefinition) => void; duplicateTheme: (id: string) => void;
  deleteTheme: (id: string) => void; getActiveTheme: () => ThemeDefinition;
  hydrateFromBackend: (backendTheme: ThemeDefinition | null) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themes: defaultThemes,
      activeThemeId: 'default',
      userMode: 'system',
      hasHydratedFromBackend: false,
      setUserMode: (mode) => set({ userMode: mode }),
      setActiveThemeId: (id) => set({ activeThemeId: id }),
      saveTheme: (theme) => set((s) => {
        const exists = s.themes.find((t) => t.id === theme.id);
        if (exists) return { themes: s.themes.map((t) => (t.id === theme.id ? theme : t)) };
        return { themes: [...s.themes, theme] };
      }),
      duplicateTheme: (id) => set((s) => {
        const src = s.themes.find((t) => t.id === id); if (!src) return s;
        const copy: ThemeDefinition = { ...src, id: `theme_${Date.now()}`, name: `${src.name} cópia`, slug: `${src.slug}-copy-${Date.now()}`, status: 'draft', dateAt: new Date().toISOString() };
        return { themes: [...s.themes, copy] };
      }),
      deleteTheme: (id) => set((s) => {
        if (id === 'default' || id === 'porteiro-argila') return s;
        if (s.activeThemeId === id) return { themes: s.themes.filter((t) => t.id !== id), activeThemeId: 'default' };
        return { themes: s.themes.filter((t) => t.id !== id) };
      }),
      getActiveTheme: () => {
        const { themes, activeThemeId } = get();
        return themes.find((t) => t.id === activeThemeId) || defaultTheme;
      },
      hydrateFromBackend: (backendTheme) => {
        if (!backendTheme) { set({ hasHydratedFromBackend: true }); return; }
        const exists = get().themes.find(t => t.id === backendTheme.id);
        if (!exists) set({ themes: [...get().themes, backendTheme] });
        set({ activeThemeId: backendTheme.id, hasHydratedFromBackend: true });
      }
    }),
    { name: 'porteiro-theme-store', partialize: (s) => ({ themes: s.themes, activeThemeId: s.activeThemeId, userMode: s.userMode }) }
  )
);