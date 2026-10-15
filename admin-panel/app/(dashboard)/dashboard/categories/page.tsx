"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { useCategories } from "@/hooks/use-categories";
import { useAuthStore } from "@/stores/useAuthStore";
import { CanButton } from "@/components/shared/can-button";
import { CategoryModal } from "@/components/categories/category-modal";
import { CategoryListItem } from "@/components/categories/category-list-item";
import type { Category } from "@/lib/api/categories";
import { useConfirm } from "@/lib/confirm-context";
import { Card } from "@/components/ui/card";

export default function CategoriesPage() {
  const confirm = useConfirm();
  const { categories, loading, saving, createCategory, updateCategory, deleteCategory } = useCategories();

  const availableTenants = useAuthStore((s) => s.availableTenants);
  const selectedTenantId = useAuthStore((s) => s.selectedTenantId);
  const currentTenant = availableTenants.find((t) => t.id === selectedTenantId);

  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; category: Category } | null>(null);

  const filtered = useMemo(() => {
    const lower = q.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(lower));
  }, [categories, q]);

  async function handleSave(data: { name: string }) {
    if (modal?.mode === "create") {
      const ok = await createCategory(data);
      if (ok) setModal(null);
    } else if (modal?.mode === "edit" && modal.category) {
      const ok = await updateCategory(modal.category.id, data);
      if (ok) setModal(null);
    }
  }

  async function handleDelete(category: Category) {
    const ok = await confirm({
      title: "Deletar categoria?",
      description: `A categoria "${category.name}" será removida.`,
      confirmLabel: "Deletar",
      variant: "danger",
    });
    if (!ok) return;
    await deleteCategory(category.id);
  }

  return (
    <div className="p-6 space-y-4 bg-transparent min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">{categories.length} categoria(s) em {currentTenant?.name ?? "—"}</p>
        </div>
        <CanButton permission="catalog.categories.create" onClick={() => setModal({ mode: "create" })}>+ Nova Categoria</CanButton>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome..." className="w-full pl-9 pr-3 py-2 bg-card/70 border border-border rounded-xl text-sm backdrop-blur-md" />
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Nenhuma categoria encontrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="p-3 text-left font-medium">Nome</th>
                <th className="p-3 text-left font-medium">Criada em</th>
                <th className="p-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <CategoryListItem key={c.id} category={c} onEdit={() => setModal({ mode: "edit", category: c })} onDelete={() => handleDelete(c)} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <CategoryModal open={!!modal} mode={modal?.mode ?? "create"} category={modal?.mode === "edit" ? modal.category : null} saving={saving} onClose={() => setModal(null)} onSave={handleSave} />
    </div>
  );
}