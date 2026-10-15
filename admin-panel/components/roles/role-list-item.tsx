"use client";

import { Shield, Pencil, Trash2 } from "lucide-react";
import type { Role } from "@/lib/api/roles";

type Props = {
  role: Role;
  tenantName: string;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function RoleListItem({ role, tenantName, isActive, onSelect, onEdit, onDelete }: Props) {
  return (
    <div
      onClick={onSelect}
      className={`group p-3 rounded-xl border cursor-pointer transition
        ${isActive
         ? "bg-primary text-primary-foreground border-primary shadow-md"
          : "bg-card/70 border-border/50 hover:bg-card backdrop-blur-md"
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2.5 flex-1 overflow-hidden">
          <Shield size={16} className={`mt-0.5 shrink-0 ${isActive? "text-primary-foreground" : "text-muted-foreground"}`} />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{role.name}</p>
            <p className={`text-xs truncate mt-0.5 ${isActive? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {role.description || "—"}
            </p>
            <p className={`text-xs mt-1 ${isActive? "text-primary-foreground/60" : "text-muted-foreground/70"}`}>
              {tenantName} • {role._count.permissions} perms • {role._count.users} users
            </p>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="w-6 h-6 rounded-md border bg-background/80 flex items-center justify-center hover:bg-background">
            <Pencil size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-6 h-6 rounded-md border bg-background/80 flex items-center justify-center hover:bg-red-50 text-red-500">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}