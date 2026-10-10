"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useAuthStore } from "@/stores/useAuthStore";
import { CanButton } from "@/components/shared/can-button";
import { ProductModal } from "@/components/products/product-modal";
import { ProductListItem } from "@/components/products/product-list-item";
import type { Product } from "@/lib/api/products";
import { useConfirm } from "@/lib/confirm-context";

export default function ProductsPage() {
  const confirm = useConfirm();
  const {
    products,
    loading,
    saving,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useProducts();

  const { categories } = useCategories();

  const availableTenants = useAuthStore((s) => s.availableTenants);
  const selectedTenantId = useAuthStore((s) => s.selectedTenantId);
  const currentTenant = availableTenants.find((t) => t.id === selectedTenantId);

  const [q, setQ] = useState("");
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; product: Product } | null
  >(null);

  const filtered = useMemo(() => {
    const lower = q.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower),
    );
  }, [products, q]);

  async function handleSave(data: {
    name: string;
    description: string;
    price: number;
    stock: number;
    categoryId: number;
  }) {
    if (modal?.mode === "create") {
      const ok = await createProduct(data);
      if (ok) setModal(null);
    } else if (modal?.mode === "edit" && modal.product) {
      const ok = await updateProduct(modal.product.id, data);
      if (ok) setModal(null);
    }
  }



  async function handleDelete(product: Product) {
    const ok = await confirm({
      title: "Deletar produto?",
      description: `O produto "${product.name}" será removido.`,
      confirmLabel: "Deletar",
      variant: "danger",
    });
    if (!ok) return;
    await deleteProduct(product.id);
  }
  return (
    <div className="p-6 space-y-4 bg-background min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} produto(s) em {currentTenant?.name ?? "—"}
          </p>
        </div>

        <CanButton
          permission="catalog.products.create"
          onClick={() => setModal({ mode: "create" })}
        >
          + Novo Produto
        </CanButton>
      </div>

      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-2.5 text-muted-foreground"
          size={14}
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou descrição..."
          className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Produto</th>
                <th className="p-3 text-left font-medium">Categoria</th>
                <th className="p-3 text-left font-medium">Preço</th>
                <th className="p-3 text-left font-medium">Estoque</th>
                <th className="p-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <ProductListItem
                  key={p.id}
                  product={p}
                  onEdit={() => setModal({ mode: "edit", product: p })}
                  onDelete={() => handleDelete(p)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ProductModal
        open={!!modal}
        mode={modal?.mode ?? "create"}
        product={modal?.mode === "edit" ? modal.product : null}
        categories={categories}
        saving={saving}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />
    </div>
  );
}