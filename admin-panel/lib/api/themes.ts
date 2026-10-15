import { api } from "@/lib/api";
import type { ThemeDefinition } from "@/stores/useThemeStore";

export type ThemeSummary = { id: string; name: string; slug: string; style: string; status: string; density: string; };

export const ThemesAPI = {
  list: () => api<ThemeDefinition[]>("/themes"),
  get: (id: string) => api<ThemeDefinition>(`/themes/${id}`),
  create: (payload: any) => api<ThemeDefinition>("/themes", { method: "POST", body: payload }),
  update: (id: string, payload: any) => api<ThemeDefinition>(`/themes/${id}`, { method: "PATCH", body: payload }),
  remove: (id: string) => api<void>(`/themes/${id}`, { method: "DELETE" }),
};