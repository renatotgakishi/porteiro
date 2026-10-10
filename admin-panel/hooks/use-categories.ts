"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  CategoriesAPI,
  type Category,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/api/categories";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CategoriesAPI.list();
      setCategories(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setCategories([]);
        } else if (err.status === 403) {
          toast.error("Sem permissão para ver categorias");
        } else {
          toast.error(`Erro ao carregar categorias (${err.status})`);
        }
      } else {
        toast.error("Erro ao carregar categorias");
      }
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCategory(input: CreateCategoryInput) {
    setSaving(true);
    try {
      await CategoriesAPI.create(input);
      toast.success("Categoria criada");
      await load();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          toast.error("Sem permissão");
        } else if (err.status === 409) {
          toast.error("Já existe uma categoria com esse nome");
        } else {
          toast.error(`Erro ao criar categoria (${err.status})`);
        }
      } else {
        toast.error("Erro ao criar categoria");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateCategory(id: number, input: UpdateCategoryInput) {
    setSaving(true);
    try {
      await CategoriesAPI.update(id, input);
      toast.success("Categoria atualizada");
      await load();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          toast.error("Sem permissão");
        } else if (err.status === 409) {
          toast.error("Já existe uma categoria com esse nome");
        } else if (err.status === 404) {
          toast.error("Categoria não encontrada");
        } else {
          toast.error(`Erro ao atualizar (${err.status})`);
        }
      } else {
        toast.error("Erro ao atualizar categoria");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: number) {
    try {
      await CategoriesAPI.remove(id);
      toast.success("Categoria removida");
      await load();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Sem permissão");
      } else {
        toast.error("Erro ao remover categoria");
      }
      return false;
    }
  }

  return {
    categories,
    loading,
    saving,
    createCategory,
    updateCategory,
    deleteCategory,
    reload: load,
  };
}