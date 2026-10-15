"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { ThemeGlobalStyles } from "@/components/theme/theme-global";
import { useThemeStore } from "@/stores/useThemeStore";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const bootstrapUser = useAuthStore((s) => s.bootstrapUser);
  const logout = useAuthStore((s) => s.logout);
  const collapsed = useSidebarStore(s => s.collapsed);
  const setCollapsed = useSidebarStore(s => s.setCollapsed);
  const [open, setOpen] = useState<Record<string, boolean>>({ "Gestão de Acesso": true, Catálogo: true, Financeiro: false, Observabilidade: false });

  const activeStyle = useThemeStore(s => s.themes.find(t => t.id === s.activeThemeId)?.style || 'flat');

  useEffect(() => { const st = useAuthStore.getState(); if (!st.user || st.availableTenants.length === 0) void bootstrapUser(); }, [bootstrapUser]);
  useEffect(() => { if (!isBootstrapping && !user) router.replace("/login"); }, [isBootstrapping, user, router]);
  useEffect(() => { if (pathname.startsWith('/dashboard/themes')) setCollapsed(true); }, [pathname, setCollapsed]);

  if (isBootstrapping || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;

  async function handleLogout() { await logout(); router.replace("/login"); }
  return (
    <div className={`flex min-h-screen text-foreground ${activeStyle === 'glass' ? 'bg-transparent' : 'bg-[hsl(var(--bg))]'}`}>
      <ThemeGlobalStyles />
      <aside className={`${collapsed ? "w-14" : "w-64"} h-screen border-r border-border bg-card transition-all flex flex-col overflow-hidden shrink-0`}>
        <TenantSwitcher collapsed={collapsed} onCollapse={() => setCollapsed(true)} />
        <AppSidebar collapsed={collapsed} open={open} setOpen={setOpen} setCollapsed={setCollapsed} pathname={pathname} />
        <div className="p-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-xs">{getInitials(user.name ?? user.email)}</div>
            {!collapsed && <div className="min-w-0"><p className="text-sm font-medium leading-none truncate">{user.name ?? user.email}</p><p className="text-xs text-muted-foreground truncate">{user.email}</p></div>}
          </div>
          {!collapsed && <button onClick={handleLogout} className="p-2 rounded-lg border border-border hover:bg-muted"><LogOut size={14} /></button>}
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
function getInitials(i: string) { const p = i.trim().split(/\s+/); if (p.length === 1) return p[0].slice(0, 2).toUpperCase(); return (p[0][0] + p[p.length - 1][0]).toUpperCase(); }