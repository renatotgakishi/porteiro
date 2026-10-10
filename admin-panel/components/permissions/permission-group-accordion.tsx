"use client";

import { ChevronDown } from "lucide-react";
import { PermissionItem } from "./permission-item";
import type { ResourceGroup } from "@/lib/permissions/grouping";

type Props = {
  resource: ResourceGroup;
  isOpen: boolean;
  onToggle: () => void;
  isPermChecked: (id: string) => boolean;
  onTogglePerm: (id: string) => void;
  onToggleGroup: () => void;
};

export function PermissionGroupAccordion({
  resource,
  isOpen,
  onToggle,
  isPermChecked,
  onTogglePerm,
  onToggleGroup,
}: Props) {
  const total = resource.permissions.length;
  const selected = resource.permissions.filter((p) =>
    isPermChecked(p.id),
  ).length;
  const isAllSelected = total > 0 && selected === total;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <ChevronDown
            size={12}
            className={`transition ${isOpen ? "rotate-180" : ""} text-muted-foreground`}
          />
          <span className="text-sm font-medium tracking-tight">
            {resource.label}
          </span>
          <span className="text-xs text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-full">
            {selected}/{total}
          </span>
        </button>

        <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleGroup}
            className="rounded border-border"
          />
          Tudo
        </label>
      </div>

      {isOpen && (
        <div className="divide-y divide-border">
          {resource.permissions.map((p) => (
            <PermissionItem
              key={p.id}
              permKey={p.key}
              description={p.description || p.key}
              checked={isPermChecked(p.id)}
              onToggle={() => onTogglePerm(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}