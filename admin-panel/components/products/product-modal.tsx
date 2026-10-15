"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/api/products";
import type { Category } from "@/lib/api/categories";
import { Combobox, type ComboboxOption } from "@/components/shared/combobox";
import { CrudModal } from "@/components/shared/crud-modal";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  product: Product | null;
  categories: Category[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; price: number; stock: number; categoryId: number; }) => Promise<void>;
};

export function ProductModal({ open, mode, product, categories, saving, onClose, onSave }: Props) {
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
      setCategoryId(categories.length > 0? String(categories[0].id) : "");
    }
    setError("");
  }, [open, mode, product, categories]);

  async function handleSave() {
    setError("");
    if (!name.trim()) return setError("Nome é obrigatório");
    if (!description.trim()) return setError("Descrição é obrigatória");
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) return setError("Preço inválido");
    const stockNum = Number(stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) return setError("Estoque inválido");
    if (!categoryId) return setError("Selecione uma categoria");

    await onSave({ name: name.trim(), description: description.trim(), price: priceNum, stock: stockNum, categoryId: Number(categoryId) });
  }

  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title={mode === "edit"? "Editar Produto" : "Novo Produto"}
      onSave={handleSave}
      saveLabel={saving? "Salvando..." : "Salvar"}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Teclado Mecânico" className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background/60 backdrop-blur-sm" autoFocus />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Descrição</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição" className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background/60 backdrop-blur-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Preço (R$)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" type="number" step="0.01" min="0" className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background/60" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Estoque</label>
            <input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" type="number" min="0" className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background/60" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Categoria</label>
          {categories.length === 0? (
            <p className="text-xs text-amber-500 mt-1">Nenhuma categoria cadastrada. Crie uma primeiro.</p>
          ) : (
            <div className="mt-1">
              <Combobox
                options={categories.map<ComboboxOption>((c) => ({ value: String(c.id), label: c.name }))}
                value={categoryId || null}
                onChange={(v) => setCategoryId(v)}
                placeholder="Selecione uma categoria..."
                emptyMessage="Nenhuma categoria encontrada"
              />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </CrudModal>
  );
}