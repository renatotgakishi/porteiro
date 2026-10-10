"use client";

import type { Product } from "@/lib/api/products";
import { CanGhostButton } from "../shared/can-button";

type Props = {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
};

function formatPrice(price: string): string {
  const num = Number(price);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function ProductListItem({ product, onEdit, onDelete }: Props) {
  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <p className="font-medium text-sm">{product.name}</p>
        <p className="text-xs text-muted-foreground truncate max-w-md">
          {product.description}
        </p>
      </td>
      <td className="p-3 text-xs">
        {product.category ? (
          <span className="bg-muted px-2 py-0.5 rounded-full border border-border">
            {product.category.name}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-3 text-sm font-medium">{formatPrice(product.price)}</td>
      <td className="p-3 text-sm">
        {product.stock > 0 ? (
          <span>{product.stock}</span>
        ) : (
          <span className="text-red-500 text-xs">esgotado</span>
        )}
      </td>
      <td className="p-3 text-right whitespace-nowrap">
        <div className="inline-flex gap-2">
          <CanGhostButton
            permission="catalog.products.update"
            onClick={onEdit}
          >
            Editar
          </CanGhostButton>
          <CanGhostButton
            permission="catalog.products.delete"
            onClick={onDelete}
            className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Deletar
          </CanGhostButton>
        </div>
      </td>
    </tr>
  );
}