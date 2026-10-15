"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/lib/api/categories";
import { CrudModal } from "@/components/shared/crud-modal";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  category: Category | null;
  saving: boolean;
  onClose: () => void;
  onSave: (data: { name: string }) => Promise<void>;
};

export function CategoryModal({ open, mode, category, saving, onClose, onSave }: Props) {
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

  async function handleSave() {
    setError("");
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    await onSave({ name: name.trim() });
  }

  return (
    <CrudModal
      open={open}
      onClose={onClose}
      title={mode === "edit" ? "Editar Categoria" : "Nova Categoria"}
      onSave={handleSave}
      saveLabel={saving ? "Salvando..." : "Salvar"}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Eletrônicos"
            className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background/60 backdrop-blur-sm"
            autoFocus
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </CrudModal>
  );
}