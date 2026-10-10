import { api } from "../api"

export type UserRole = {
  id: string
  name: string
}

export type User = {
  id: string
  tenantId: string | null
  name: string | null
  email: string
  emailVerified: string | null
  image: string | null
  lastLoginAt: string | null
  dateAt: string
  userId: string
  roles: UserRole[]
}

export type CreateUserInput = {
  name?: string
  email: string
  password: string
  tenantId?: string
  roleIds?: string[]
}

export type UpdateUserInput = {
  name?: string
  email?: string
  password?: string
  tenantId?: string
  roleIds?: string[]
}

export const UsersAPI = {
  list: (tenantId?: string | null) => {
    const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""

    return api<User[]>(`/users${qs}`)
  },
  invite: (id: string) =>
    api<{ message: string }>(`/users/${id}/invite`, { method: "POST" }),

  get: (id: string) => api<User>(`/users/${id}`),

  create: (input: CreateUserInput) =>
    api<User>("/users", { method: "POST", body: input }),

  update: (id: string, input: UpdateUserInput) =>
    api<User>(`/users/${id}`, { method: "PATCH", body: input }),

  remove: (id: string) => api<User>(`/users/${id}`, { method: "DELETE" }),
}
