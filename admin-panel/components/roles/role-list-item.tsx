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

export function RoleListItem({
  role,
  tenantName,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div
      onClick={onSelect}
      className={`group p-3 rounded-xl border cursor-pointer transition ${
        isActive
          ? "bg-stone-900 text-white dark:bg-white dark:text-black border-stone-900 dark:border-white"
          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2.5 flex-1 overflow-hidden">
          <Shield
            size={16}
            className={`mt-0.5 shrink-0 ${
              isActive ? "text-white dark:text-black" : "text-stone-400"
            }`}
          />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate flex items-center gap-2">
              {role.name}
            </p>
            <p
              className={`text-xs truncate mt-0.5 ${
                isActive
                  ? "text-stone-300 dark:text-stone-500"
                  : "text-stone-500"
              }`}
            >
              {role.description || "—"}
            </p>
            <p
              className={`text-xs mt-1 ${
                isActive
                  ? "text-stone-400 dark:text-stone-500"
                  : "text-stone-400"
              }`}
            >
              {tenantName} • {role._count.permissions} perms •{" "}
              {role._count.users} users
            </p>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="w-6 h-6 rounded-md border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-white dark:hover:bg-black"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-6 h-6 rounded-md border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-red-50 text-red-500"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}