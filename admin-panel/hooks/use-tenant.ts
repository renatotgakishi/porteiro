"use client";

import { useAuthStore } from "@/stores/useAuthStore";

export function useTenant() {
  const tenantId = useAuthStore((s) => s.selectedTenantId);
  return { tenantId };
}