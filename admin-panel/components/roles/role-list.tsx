"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { RoleListItem } from "./role-list-item";
import type { Role } from "@/lib/api/roles";

type Props = {
  roles: Role[];
  selectedRoleId: string | null;
  tenantName: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (role: Role) => void;
  onDelete: (id: string) => void;
};

export function RoleList({
  roles,
  selectedRoleId,
  tenantName,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return roles.filter((r) =>
      r.name.toLowerCase().includes(q.toLowerCase()),
    );
  }, [roles, q]);

  return (
    <div className="w-80 shrink-0 border-r border-border bg-card flex flex-col rounded-l-2xl overflow-hidden">
      <div className="p-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Papéis</h2>
          <button
            onClick={onCreate}
            className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 border border-border rounded-full px-3 py-1.5 bg-background">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar papéis..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-background">
        {filtered.map((role) => (
          <RoleListItem
            key={role.id}
            role={role}
            tenantName={tenantName}
            isActive={role.id === selectedRoleId}
            onSelect={() => onSelect(role.id)}
            onEdit={() => onEdit(role)}
            onDelete={() => onDelete(role.id)}
          />
        ))}
      </div>
    </div>
  );
}