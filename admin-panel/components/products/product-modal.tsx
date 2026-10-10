"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/api/products";
import type { Category } from "@/lib/api/categories";
import { Combobox, type ComboboxOption } from "@/components/shared/combobox";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  product: Product | null;
  categories: Category[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    price: number;
    stock: number;
    categoryId: number;
  }) => Promise<void>;
};

export function ProductModal({
  open,
  mode,
  product,
  categories,
  saving,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && product) {
      setName(product.name);
      setDescription(product.description);
      setPrice(String(product.price));
      setStock(String(product.stock));
      setCategoryId(String(product.categoryId));
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setStock("");
      setCategoryId(
        categories.length > 0 ? String(categories[0].id) : "",
      );
    }
    setError("");
  }, [open, mode, product, categories]);

  if (!open) return null;

  async function handleSave() {
    setError("");

    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    if (!description.trim()) {
      setError("Descrição é obrigatória");
      return;
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Preço inválido");
      return;
    }
    const stockNum = Number(stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setError("Estoque inválido");
      return;
    }
    if (!categoryId) {
      setError("Selecione uma categoria");
      return;
    }

    await onSave({
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      stock: stockNum,
      categoryId: Number(categoryId),
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl p-6 w-full max-w-lg border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-sm text-foreground">
          {mode === "edit" ? "Editar Produto" : "Novo Produto"}
        </h2>

        <div className="space-y-3 mt-4">
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Teclado Mecânico"
              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Descrição</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição"
              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Preço (R$)
              </label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Estoque</label>
              <input
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                type="number"
                min="0"
                className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Categoria</label>
            {categories.length === 0 ? (
              <p className="text-xs text-amber-500 mt-1">
                Nenhuma categoria cadastrada. Crie uma primeiro.
              </p>
            ) : (
                        <div>
            <label className="text-xs text-muted-foreground">Categoria</label>
            {categories.length === 0 ? (
              <p className="text-xs text-amber-500 mt-1">
                Nenhuma categoria cadastrada. Crie uma primeiro.
              </p>
            ) : (
              <div className="mt-1">
                <Combobox
                  options={categories.map<ComboboxOption>((c) => ({
                    value: String(c.id),
                    label: c.name,
                  }))}
                  value={categoryId || null}
                  onChange={(v) => setCategoryId(v)}
                  placeholder="Selecione uma categoria..."
                  emptyMessage="Nenhuma categoria encontrada"
                />
              </div>
            )}
          </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-border rounded-full text-sm hover:bg-muted transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || categories.length === 0}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}