import { api } from "../api";

export type Category = {
  id: number;
  tenantId: string;
  name: string;
  dateAt: string;
  userId: string;
  deleted: boolean;
};

export type CreateCategoryInput = {
  name: string;
};

export type UpdateCategoryInput = {
  name?: string;
};

export const CategoriesAPI = {
  list: () => api<Category[]>("/categories"),

  get: (id: number) => api<Category>(`/categories/${id}`),

  create: (input: CreateCategoryInput) =>
    api<Category>("/categories", { method: "POST", body: input }),

  update: (id: number, input: UpdateCategoryInput) =>
    api<Category>(`/categories/${id}`, {
      method: "PATCH",
      body: input,
    }),

  remove: (id: number) =>
    api<Category>(`/categories/${id}`, { method: "DELETE" }),
};