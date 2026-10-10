"use client";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Shield,
  Users,
  ChevronDown,
  Package,
  Tag,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,

} from "lucide-react";
import { usePermissions } from "@/lib/permission-context";

type OpenState = Record<string, boolean>;
type Props = {
  collapsed: boolean;
  open: OpenState;
  setOpen: React.Dispatch<React.SetStateAction<OpenState>>;
  setCollapsed: (v: boolean) => void;
  pathname: string;
};

export function AppSidebar({
  collapsed,
  open,
  setOpen,
  setCollapsed,
  pathname,
}: Props) {
  const { canViewMenu } = usePermissions();
  const toggle = (key: string) => setOpen((s) => ({ ...s, [key]: !s[key] }));
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Permissions reais do backend
  const canTenants = canViewMenu("platform.tenants.read");
  const canRoles = canViewMenu("iam.roles.read");
  const canUsers = canViewMenu("iam.users.read");
  const canProducts = canViewMenu("catalog.products.read");
  const canCategories = canViewMenu("catalog.categories.read");

  // Permissions que ainda não existem no backend
  const canReports = canViewMenu("reports.read");
  const canBilling = canViewMenu("billing.read");

  const canObservabilityOverview = canViewMenu("observabilidade.visaogeral.read",);

  const canObservabilityApplication = canViewMenu(
    "observabilidade.applicacao.read",
  );

  const canObservabilityDatabase = canViewMenu(
    "observabilidade.bancodedados.read",
  );

  const canObservabilityLogs = canViewMenu(
    "observabilidade.logs.read",
  );

  const linkClass = (active: boolean, disabled: boolean) => {
    if (disabled)
    return "flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm opacity-40 cursor-not-allowed pointer-events-none text-muted-foreground";
    if (active)
      return "flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm bg-primary text-primary-foreground font-medium";
    return "flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition";
  };

  const groupLabelClass =
    "px-3 py-1.5 text-xs font-medium text-muted-foreground";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {collapsed && (
        <div className="p-3 flex justify-center">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Expandir menu"
            title="Expandir menu"
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <div>
          {!collapsed && <p className={groupLabelClass}>Principal</p>}
          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition ${isActive("/dashboard") && pathname === "/dashboard"
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
          >
            <LayoutDashboard size={16} /> {!collapsed && "Dashboard"}
          </Link>
        </div>

        <div>
          {!collapsed && (
            <p className={groupLabelClass}>Gestão de Acesso</p>
          )}
          <div className="space-y-1">
            <button
              onClick={() => toggle("Gestão de Acesso")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition"
            >
              <span className="flex items-center gap-2.5">
                <Shield size={16} /> {!collapsed && "Gestão de Acesso"}
              </span>
              {!collapsed && (
                <ChevronDown
                  size={14}
                  className={`${open["Gestão de Acesso"] ? "rotate-180" : ""
                    } transition`}
                />
              )}
            </button>

            {open["Gestão de Acesso"] && !collapsed && (
              <div className="ml-3 border-l border-border pl-3 space-y-1 mt-1">
                <Link
                  href={canTenants ? "/dashboard/tenants" : "#"}
                  onClick={(e) => !canTenants && e.preventDefault()}
                  className={linkClass(
                    isActive("/dashboard/tenants"),
                    !canTenants,
                  )}
                >
                  <Building2 size={14} /> Inquilinos & Empresas{" "}
                  {!canTenants && (
                    <span className="ml-auto text-xs bg-muted px-1 py-0.5 rounded border">
                      🔒
                    </span>
                  )}
                </Link>
                <Link
                  href={canRoles ? "/dashboard/roles" : "#"}
                  onClick={(e) => !canRoles && e.preventDefault()}
                  className={linkClass(
                    isActive("/dashboard/roles"),
                    !canRoles,
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Shield size={14} /> Cargos & Permissões
                  </span>
                  {!canRoles && (
                    <span className="ml-auto text-xs bg-muted px-1 py-0.5 rounded border">
                      🔒
                    </span>
                  )}
                  {canRoles && isActive("/dashboard/roles") && (
                    <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
                  )}
                </Link>
                <Link
                  href={canUsers ? "/dashboard/users" : "#"}
                  onClick={(e) => !canUsers && e.preventDefault()}
                  className={linkClass(
                    isActive("/dashboard/users"),
                    !canUsers,
                  )}
                >
                  <Users size={14} /> Usuários & Cargos{" "}
                  {!canUsers && (
                    <span className="ml-auto text-xs bg-muted px-1 py-0.5 rounded border">
                      🔒
                    </span>
                  )}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div>
          {!collapsed && <p className={groupLabelClass}>Catálogo</p>}
          <div className="space-y-1">
            <button
              onClick={() => toggle("Catálogo")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition"
            >
              <span className="flex items-center gap-2.5">
                <Package size={16} /> {!collapsed && "Catálogo"}
              </span>
              {!collapsed && (
                <ChevronDown
                  size={14}
                  className={`${open["Catálogo"] ? "rotate-180" : ""
                    } transition`}
                />
              )}
            </button>

            {open["Catálogo"] && !collapsed && (
              <div className="ml-3 border-l border-border pl-3 space-y-1 mt-1">
                <Link
                  href={canProducts ? "/dashboard/products" : "#"}
                  onClick={(e) => !canProducts && e.preventDefault()}
                  className={linkClass(
                    isActive("/dashboard/products"),
                    !canProducts,
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Package size={14} /> Produtos
                  </span>
                  {!canProducts && (
                    <span className="ml-auto text-xs bg-muted px-1 py-0.5 rounded border">
                      🔒
                    </span>
                  )}
                </Link>
                <Link
                  href={canCategories ? "/dashboard/categories" : "#"}
                  onClick={(e) => !canCategories && e.preventDefault()}
                  className={linkClass(
                    isActive("/dashboard/categories"),
                    !canCategories,
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Tag size={14} /> Categorias
                  </span>
                  {!canCategories && (
                    <span className="ml-auto text-xs bg-muted px-1 py-0.5 rounded border">
                      🔒
                    </span>
                  )}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div>
          {!collapsed && <p className={groupLabelClass}>Analytics</p>}
          <Link
            href={canReports ? "/dashboard/reports" : "#"}
            onClick={(e) => !canReports && e.preventDefault()}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition ${!canReports
              ? "opacity-40 pointer-events-none text-muted-foreground"
              : isActive("/dashboard/reports")
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
          >
            <BarChart3 size={16} /> {!collapsed && "Relatórios"}{" "}
            {!canReports && (
              <span className="ml-auto text-xs border px-1 rounded">🔒</span>
            )}
          </Link>
        </div>
        <div>
          {!collapsed && <p className={groupLabelClass}>Observabilidade</p>}

          <div className="space-y-1">
            <button
              onClick={() => toggle("Observabilidade")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition"
            >
              <span className="flex items-center gap-2.5">
                <Activity size={16} /> {!collapsed && "Observabilidade"}
              </span>

              {!collapsed && (
                <ChevronDown
                  size={14}
                  className={`${open["Observabilidade"] ? "rotate-180" : ""
                    } transition`}
                />
              )}
            </button>

            {open["Observabilidade"] && !collapsed && (
              <div className="ml-3 border-l border-border pl-3 space-y-1 mt-1">
                <Link
                  href={
                    canObservabilityOverview
                      ? "/dashboard/observability/overview"
                      : "#"
                  }
                  onClick={(e) =>
                    !canObservabilityOverview && e.preventDefault()
                  }
                  className={linkClass(
                    isActive("/dashboard/observability") &&
                    pathname === "/dashboard/observability/overview",
                    !canObservabilityOverview,
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Activity size={14} /> Visão geral
                  </span>

                  {!canObservabilityOverview && (
                    <span className="ml-auto text-xs bg-muted px-1 py-0.5 rounded border">
                      🔒
                    </span>
                  )}
                </Link>

                <Link
                  href={
                    canObservabilityApplication
                      ? "/dashboard/observability/application"
                      : "#"
                  }
                  onClick={(e) =>
                    !canObservabilityApplication && e.preventDefault()
                  }
                  className={linkClass(
                    isActive("/dashboard/observability/application"),
                    !canObservabilityApplication,
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Activity size={14} /> Aplicação
                  </span>

                  {!canObservabilityApplication && (
                    <span className="ml-auto text-xs bg-muted px-1 py-0.5 rounded border">
                      🔒
                    </span>
                  )}
                </Link>

                <Link
                  href={
                    canObservabilityDatabase
                      ? "/dashboard/observability/database"
                      : "#"
                  }
                  onClick={(e) =>
                    !canObservabilityDatabase && e.preventDefault()
                  }
                  className={linkClass(
                    isActive("/dashboard/observability/database"),
                    !canObservabilityDatabase,
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Activity size={14} /> Banco de dados
                  </span>

                  {!canObservabilityDatabase && (
                    <span className="ml-auto text-xs bg-muted px-1 py-0.5 rounded border">
                      🔒
                    </span>
                  )}
                </Link>

                <Link
                  href={
                    canObservabilityLogs
                      ? "/dashboard/observability/log"
                      : "#"
                  }
                  onClick={(e) =>
                    !canObservabilityLogs && e.preventDefault()
                  }
                  className={linkClass(
                    isActive("/dashboard/observability/log"),
                    !canObservabilityLogs,
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Activity size={14} /> Logs
                  </span>

                  {!canObservabilityLogs && (
                    <span className="ml-auto text-xs bg-muted px-1 py-0.5 rounded border">
                      🔒
                    </span>
                  )}
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}