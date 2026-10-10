"use client";

import { Search } from "lucide-react";

type Props = {
  query: string;
  setQuery: (v: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectAll: () => void;
};

export function PermissionToolbar({
  query,
  setQuery,
  onExpandAll,
  onCollapseAll,
  onSelectAll,
}: Props) {
  return (
    <div className="p-3 border-b border-border bg-card sticky top-0 z-10 space-y-3 rounded-t-2xl">
      <div className="flex items-center gap-2 border border-border rounded-full px-3 py-1.5 bg-background">
        <Search size={14} className="text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar permissão por key..."
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExpandAll}
          className="text-sm font-medium text-foreground px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition"
        >
          Expandir tudo
        </button>
        <button
          onClick={onCollapseAll}
          className="text-sm font-medium text-foreground px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition"
        >
          Colapsar
        </button>
        <button
          onClick={onSelectAll}
          className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground ml-auto hover:opacity-90 transition"
        >
          Selecionar tudo
        </button>
      </div>
    </div>
  );
}