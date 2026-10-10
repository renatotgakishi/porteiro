import { api } from "../api";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  licenseExpiresAt: string;
  connectionStringEncrypted: string | null;
  dateAt: string;
  userId: string;
  deleted: boolean;
};

export type CreateTenantInput = {
  name: string;
  licenseExpiresAt: string;
  connectionStringEncrypted?: string;
};

export type UpdateTenantInput = {
  name?: string;
  licenseExpiresAt?: string;
  connectionStringEncrypted?: string;
};

export const TenantsAPI = {
  list: () => api<Tenant[]>("/tenants"),

  get: (id: string) => api<Tenant>(`/tenants/${id}`),

  create: (input: CreateTenantInput) =>
    api<Tenant>("/tenants", {
      method: "POST",
      body: input,
    }),

  update: (id: string, input: UpdateTenantInput) =>
    api<Tenant>(`/tenants/${id}`, {
      method: "PATCH",
      body: input,
    }),

  remove: (id: string) =>
    api<Tenant>(`/tenants/${id}`, {
      method: "DELETE",
    }),
};