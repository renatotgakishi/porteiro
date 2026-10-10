"use client";

import { useState } from "react";
import { ChevronDown, PanelLeftClose } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

type Props = {
  collapsed?: boolean;
  onCollapse?: () => void;
};

export function TenantSwitcher({ collapsed, onCollapse }: Props) {
  const selectedTenantId = useAuthStore((s) => s.selectedTenantId);
  const availableTenants = useAuthStore((s) => s.availableTenants);
  const setSelectedTenantId = useAuthStore((s) => s.setSelectedTenantId);

  const [open, setOpen] = useState(false);

  const currentTenant = availableTenants.find(
    (t) => t.id === selectedTenantId,
  );

  const canSwitch = availableTenants.length > 1;

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-violet-600">
          {(currentTenant?.name ?? "P").substring(0, 2).toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="border-b border-stone-200 dark:border-stone-800 flex items-center px-3 py-2 gap-2 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 bg-violet-600">
          {(currentTenant?.name ?? "P").substring(0, 2).toUpperCase()}
        </div>
        <button
          onClick={() => canSwitch && setOpen(!open)}
          disabled={!canSwitch}
          className="flex-1 min-w-0 text-left flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg px-1 py-1 -ml-1 disabled:cursor-default"
        >
          <div className="overflow-hidden">
            <p className="text-sm font-semibold leading-none truncate">
              {currentTenant?.name ?? "Plataforma"}
            </p>
            <p className="text-xs text-stone-500 leading-none mt-1 truncate">
              {canSwitch
                ? `${availableTenants.length} tenants`
                : currentTenant?.slug ?? "—"}
            </p>
          </div>
          {canSwitch && (
            <ChevronDown
              size={14}
              className={`text-stone-400 shrink-0 transition ${open ? "rotate-180" : ""
                }`}
            />
          )}
        </button>

        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-lg text-stone-400 hover:text-foreground hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
            aria-label="Recolher menu"
            title="Recolher menu"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {open && canSwitch && (
        <div className="mx-3 mb-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl z-50 p-1.5">
          {availableTenants.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTenantId(t.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-sm ${t.id === selectedTenantId
                  ? "bg-stone-900 text-white dark:bg-white dark:text-black"
                  : "hover:bg-stone-50 dark:hover:bg-stone-800"
                }`}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold bg-violet-600">
                {t.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-medium truncate">{t.name}</p>
                <p className="text-xs opacity-70 truncate">{t.slug}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}