"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/stores/useAuthStore";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  tenants: "Inquilinos & Empresas",
  roles: "Cargos & Permissões",
  users: "Usuários & Cargos",
  plans: "Planos",
  reports: "Relatórios",
};

export function TopBar() {
  const { theme, setTheme } = useTheme();

  const selectedTenantId = useAuthStore((s) => s.selectedTenantId);
  const availableTenants = useAuthStore((s) => s.availableTenants);

  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTenant = availableTenants.find((t) => t.id === selectedTenantId);
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.slice(1);

  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground font-medium">
          {currentTenant?.name?? "Plataforma"}
        </span>

        {crumbs.map((seg, i) => {
          const label = LABELS[seg] || seg;
          const isLast = i === crumbs.length - 1;
          return (
            <span key={seg} className="flex items-center gap-2">
              <span className="text-muted-foreground">›</span>
              {isLast? (
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                  {label}
                </span>
              ) : (
                <span className="text-foreground">
                  {label === "Cargos & Permissões"? "Gestão de Acesso" : label}
                </span>
              )}
            </span>
          );
        })}

        {crumbs.length === 0 && (
          <>
            <span className="text-muted-foreground">›</span>
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
              Dashboard
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 border border-border rounded-full px-3 py-1.5 bg-background">
          <Search size={14} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Buscar...</span>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground">
            ⌘ K
          </span>
        </div>

        <button
          onClick={() => setTheme(theme === "dark"? "light" : "dark")}
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted bg-card transition"
          title="Alternar tema claro/escuro"
          aria-label="Alternar tema claro/escuro"
        >
          {!mounted? (
            <div className="w-4 h-4" />
          ) : theme === "dark"? (
            <Sun size={16} />
          ) : (
            <Moon size={16} />
          )}
        </button>

        <button className="w-9 h-9 rounded-full border border-border flex items-center justify-center relative hover:bg-muted bg-card transition">
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            3
          </span>
        </button>
      </div>
    </div>
  );
}