import { api } from "../api";

export type Permission = {
  id: string;
  key: string;
  description: string | null;
  dateAt: string;
  userId: string;
  deleted: boolean;
};

export const PermissionsAPI = {
  list: () => api<Permission[]>("/permissions"),

  byRole: (roleId: string) =>
    api<Permission[]>(`/permissions/role/${roleId}`),
};