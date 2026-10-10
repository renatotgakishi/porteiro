"use client";

import { ChevronDown } from "lucide-react";
import { PermissionGroupAccordion } from "./permission-group-accordion";
import type { DomainGroup } from "@/lib/permissions/grouping";

type Props = {
  domain: DomainGroup;
  isOpen: boolean;
  onToggle: () => void;

  openGroups: Record<string, boolean>;
  onToggleResource: (domain: string, resource: string) => void;

  isPermChecked: (id: string) => boolean;
  onTogglePerm: (id: string) => void;
  onToggleResourceGroup: (perms: { id: string }[]) => void;
  onToggleDomainGroup: (resources: { permissions: { id: string }[] }[]) => void;
};

export function PermissionDomainAccordion({
  domain,
  isOpen,
  onToggle,
  openGroups,
  onToggleResource,
  isPermChecked,
  onTogglePerm,
  onToggleResourceGroup,
  onToggleDomainGroup,
}: Props) {
  const totalPerms = domain.resources.flatMap((r) => r.permissions);
  const totalCount = totalPerms.length;
  const selectedCount = totalPerms.filter((p) => isPermChecked(p.id)).length;
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="flex items-center justify-between px-3 py-2.5 bg-muted">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <ChevronDown
            size={14}
            className={`transition ${isOpen ? "rotate-180" : ""} text-muted-foreground`}
          />
          <span className="text-sm font-semibold tracking-tight">
            {domain.label}
          </span>
          <span className="text-xs text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-full">
            {selectedCount}/{totalCount}
          </span>
        </button>

        <label className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground hover:text-foreground transition">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={() => onToggleDomainGroup(domain.resources)}
            className="rounded border-border"
          />
          Tudo
        </label>
      </div>

      {isOpen && (
        <div className="p-2 space-y-2 bg-background">
          {domain.resources.map((resource) => {
            const key = `${domain.domain}.${resource.resource}`;
            return (
              <PermissionGroupAccordion
                key={key}
                resource={resource}
                isOpen={openGroups[key] ?? false}
                onToggle={() => onToggleResource(domain.domain, resource.resource)}
                isPermChecked={isPermChecked}
                onTogglePerm={onTogglePerm}
                onToggleGroup={() => onToggleResourceGroup(resource.permissions)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}