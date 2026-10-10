"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/api/categories";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  category: Category | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: { name: string }) => Promise<void>;
};

export function CategoryModal({
  open,
  mode,
  category,
  saving,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && category) {
      setName(category.name);
    } else {
      setName("");
    }
    setError("");
  }, [open, mode, category]);

  if (!open) return null;

  async function handleSave() {
    setError("");
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    await onSave({ name: name.trim() });
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-sm text-foreground">
          {mode === "edit" ? "Editar Categoria" : "Nova Categoria"}
        </h2>

        <div className="space-y-3 mt-4">
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Eletrônicos"
              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
              autoFocus
            />
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
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}