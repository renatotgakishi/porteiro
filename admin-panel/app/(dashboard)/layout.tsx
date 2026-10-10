"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useAuthStore } from "@/stores/useAuthStore";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const bootstrapUser = useAuthStore((s) => s.bootstrapUser);
  const logout = useAuthStore((s) => s.logout);

  const [open, setOpen] = useState<Record<string, boolean>>({
    "Gestão de Acesso": true,
    Catálogo: true,
    Financeiro: false,
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const state = useAuthStore.getState();
    if (!state.user || state.availableTenants.length === 0) {
      void bootstrapUser();
    }
  }, [bootstrapUser]);

  useEffect(() => {
    if (!isBootstrapping && !user) {
      router.replace("/login");
    }
  }, [isBootstrapping, user, router]);

  if (isBootstrapping || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center  text-muted-foreground text-sm">
        Carregando...
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={`${collapsed ? "w-14" : "w-64"
          } h-screen min-h-0 border-r border-border bg-card transition-all flex flex-col overflow-hidden`}
      >
        <TenantSwitcher collapsed={collapsed} onCollapse={() => setCollapsed(true)}
        />

        <AppSidebar
          collapsed={collapsed}
          open={open}
          setOpen={setOpen}
          setCollapsed={setCollapsed}
          pathname={pathname}
        />

        <div className="p-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
              {getInitials(user.name ?? user.email)}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none truncate">
                  {user.name ?? user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg border border-border hover:bg-muted transition"
              aria-label="Sair"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <TopBar />
        <div className="flex-1 overflow-hidden bg-background">{children}</div>
      </main>
    </div>
  );
}

function getInitials(input: string): string {
  const parts = input.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}