"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

type Ctx = {
  permissions: string[];
  hasPermission: (key: string) => boolean;
  canViewMenu: (key: string) => boolean;
  userName: string;
  roleName: string;
};

const PermissionsContext = createContext<Ctx>({
  permissions: [],
  hasPermission: () => false,
  canViewMenu: () => false,
  userName: "",
  roleName: "",
});

export function PermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const permissions = useAuthStore((s) => s.perms);
  const user = useAuthStore((s) => s.user);

  const value = useMemo<Ctx>(
    () => ({
      permissions,
      userName: user?.name ?? "",
      roleName: "",
      hasPermission: (key: string) => permissions.includes(key),
      canViewMenu: (key: string) => permissions.includes(key),
    }),
    [permissions, user],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function useCan(perm: string) {
  return usePermissions().hasPermission(perm);
}