"use client";

import type { Category } from "@/lib/api/categories";
import { CanGhostButton } from "../shared/can-button";

type Props = {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
};

export function CategoryListItem({ category, onEdit, onDelete }: Props) {
  return (
    <tr className="border-t border-border">
      <td className="p-3">
        <p className="font-medium text-sm">{category.name}</p>
      </td>
      <td className="p-3 text-xs text-muted-foreground">
        {new Date(category.dateAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "America/Sao_Paulo",
        })}
      </td>
      <td className="p-3 text-right whitespace-nowrap">
        <CanGhostButton
          permission="catalog.categories.update"
          onClick={onEdit}
          className="mr-2"
        >
          Editar
        </CanGhostButton>
        <CanGhostButton
          permission="catalog.categories.delete"
          onClick={onDelete}
          className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          Deletar
        </CanGhostButton>
      </td>
    </tr>
  );
}