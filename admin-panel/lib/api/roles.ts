import { api } from "../api";

export type RoleCount = {
  users: number;
  permissions: number;
};

export type Role = {
  id: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  dateAt: string;
  userId: string;
  deleted: boolean;
  _count: RoleCount;
};

export type CreateRoleInput = {
  name: string;
  description?: string;
  tenantId?: string;
};

export type UpdateRoleInput = {
  name?: string;
  description?: string;
  tenantId?: string;
};

export type SetPermissionsResult = {
  added: number;
  removed: number;
  total: number;
};

export const RolesAPI = {
  list: (tenantId?: string | null) => {
    const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    return api<Role[]>(`/roles${qs}`);
  },

  get: (id: string) => api<Role>(`/roles/${id}`),

  create: (input: CreateRoleInput) =>
    api<Role>("/roles", { method: "POST", body: input }),

  update: (id: string, input: UpdateRoleInput) =>
    api<Role>(`/roles/${id}`, { method: "PATCH", body: input }),

  remove: (id: string) =>
    api<Role>(`/roles/${id}`, { method: "DELETE" }),

  setPermissions: (id: string, permissionIds: string[]) =>
    api<SetPermissionsResult>(`/roles/${id}/permissions`, {
      method: "PUT",
      body: { permissionIds },
    }),
};