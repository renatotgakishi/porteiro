"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  ProductsAPI,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/api/products";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ProductsAPI.list();
      setProducts(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          // User sem tenant (admin plataforma) — lista vazia, não é erro
          setProducts([]);
        } else if (err.status === 403) {
          toast.error("Sem permissão para ver produtos");
        } else {
          toast.error(`Erro ao carregar produtos (${err.status})`);
        }
      } else {
        toast.error("Erro ao carregar produtos");
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProduct(input: CreateProductInput) {
    setSaving(true);
    try {
      await ProductsAPI.create(input);
      toast.success("Produto criado");
      await load();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          toast.error("Sem permissão");
        } else if (err.status === 404) {
          toast.error("Categoria não encontrada");
        } else if (err.status === 400) {
          toast.error("Dados inválidos");
        } else {
          toast.error(`Erro ao criar produto (${err.status})`);
        }
      } else {
        toast.error("Erro ao criar produto");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateProduct(id: number, input: UpdateProductInput) {
    setSaving(true);
    try {
      await ProductsAPI.update(id, input);
      toast.success("Produto atualizado");
      await load();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          toast.error("Sem permissão");
        } else if (err.status === 404) {
          toast.error("Produto ou categoria não encontrado");
        } else if (err.status === 400) {
          toast.error("Dados inválidos");
        } else {
          toast.error(`Erro ao atualizar produto (${err.status})`);
        }
      } else {
        toast.error("Erro ao atualizar produto");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: number) {
    try {
      await ProductsAPI.remove(id);
      toast.success("Produto removido");
      await load();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Sem permissão");
      } else {
        toast.error("Erro ao remover produto");
      }
      return false;
    }
  }

  return {
    products,
    loading,
    saving,
    createProduct,
    updateProduct,
    deleteProduct,
    reload: load,
  };
}