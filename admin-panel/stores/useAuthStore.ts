import { create } from "zustand";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const PERMISSIONS_TTL_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_PERMISSIONS_TTL_MS;
  if (!raw) return 5 * 60 * 1000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 5 * 60 * 1000;
})();

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
};

export type AuthUser = {
  id: string;
  name: string | null;
  email: string;
  tenantId: string | null;
  tenant: TenantSummary | null;
};

type AuthState = {
  user: AuthUser | null;
  perms: string[];
  expiresAt: number;
  isBootstrapping: boolean;
  isFetchingPerms: boolean;

  selectedTenantId: string | null;
  availableTenants: TenantSummary[];

  setSession: (data: {
    user: AuthUser;
    permissions: string[];
  }) => void;

  clear: () => void;

  setSelectedTenantId: (id: string | null) => void;

  fetchPermissionsIfNeeded: () => Promise<void>;

  bootstrapUser: () => Promise<void>;

  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  perms: [],
  expiresAt: 0,
  isBootstrapping: true,
  isFetchingPerms: false,

  selectedTenantId: null,
  availableTenants: [],

  setSession: ({ user, permissions }) =>
    set({
      user,
      perms: permissions,
      expiresAt: Date.now() + PERMISSIONS_TTL_MS,
      isBootstrapping: false,
      selectedTenantId: user.tenantId,
      availableTenants: user.tenant ? [user.tenant] : [],
    }),

  clear: () =>
    set({
      user: null,
      perms: [],
      expiresAt: 0,
      isBootstrapping: false,
      selectedTenantId: null,
      availableTenants: [],
    }),

  setSelectedTenantId: (id) => set({ selectedTenantId: id }),

  fetchPermissionsIfNeeded: async () => {
    const { user, perms, expiresAt, isFetchingPerms } = get();

    if (!user) return;
    if (perms.length > 0 && Date.now() < expiresAt) return;
    if (isFetchingPerms) return;

    set({ isFetchingPerms: true });

    try {
      const res = await fetch(`${API_URL}/auth/me/permissions`, {
        credentials: "include",
      });

      if (!res.ok) {
        set({ isFetchingPerms: false });
        return;
      }

      const data = (await res.json()) as { permissions: string[] };

      set({
        perms: data.permissions,
        expiresAt: Date.now() + PERMISSIONS_TTL_MS,
        isFetchingPerms: false,
      });
    } catch {
      set({ isFetchingPerms: false });
    }
  },

  bootstrapUser: async () => {
    set({ isBootstrapping: true });

    try {
      const meRes = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });

      if (!meRes.ok) {
        set({
          user: null,
          perms: [],
          expiresAt: 0,
          isBootstrapping: false,
          selectedTenantId: null,
          availableTenants: [],
        });
        return;
      }

      const user = (await meRes.json()) as AuthUser;

      // Determina tenants disponíveis.
      let availableTenants: TenantSummary[] = [];
      let selectedTenantId: string | null = null;

      if (user.tenantId === null) {
        // Plataforma: busca todos os tenants.
        try {
          const tenantsRes = await fetch(`${API_URL}/tenants`, {
            credentials: "include",
          });
          if (tenantsRes.ok) {
            const tenants = (await tenantsRes.json()) as TenantSummary[];
            availableTenants = tenants;
            selectedTenantId = tenants[0]?.id ?? null;
          }
        } catch {
          // Sem tenants, dropdown fica vazio. Não bloqueia o login.
        }
      } else if (user.tenant) {
        // Usuário normal: só o próprio tenant.
        availableTenants = [user.tenant];
        selectedTenantId = user.tenantId;
      }

      set({
        user,
        isBootstrapping: false,
        availableTenants,
        selectedTenantId,
      });

      await get().fetchPermissionsIfNeeded();
    } catch {
      set({
        user: null,
        perms: [],
        expiresAt: 0,
        isBootstrapping: false,
        selectedTenantId: null,
        availableTenants: [],
      });
    }
  },

  logout: async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignora.
    }

    set({
      user: null,
      perms: [],
      expiresAt: 0,
      isBootstrapping: false,
      selectedTenantId: null,
      availableTenants: [],
    });
  },
}));