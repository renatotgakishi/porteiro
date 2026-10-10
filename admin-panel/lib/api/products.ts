import { api } from "../api";
import type { Category } from "./categories";

export type Product = {
  id: number;
  tenantId: string;
  name: string;
  description: string;
  price: string; // Decimal serializa como string
  stock: number;
  categoryId: number;
  dateAt: string;
  userId: string;
  deleted: boolean;
  category?: Category;
};

export type CreateProductInput = {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
};

export type UpdateProductInput = {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  categoryId?: number;
};

export const ProductsAPI = {
  list: () => api<Product[]>("/products"),

  get: (id: number) => api<Product>(`/products/${id}`),

  create: (input: CreateProductInput) =>
    api<Product>("/products", { method: "POST", body: input }),

  update: (id: number, input: UpdateProductInput) =>
    api<Product>(`/products/${id}`, { method: "PUT", body: input }),

  remove: (id: number) =>
    api<Product>(`/products/${id}`, { method: "DELETE" }),
};