"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import { RolesAPI, type Role } from "@/lib/api/roles";
import {
  PermissionsAPI,
  type Permission,
} from "@/lib/api/permissions";
import { buildTree, type DomainGroup } from "@/lib/permissions/grouping";
import { useAuthStore } from "@/stores/useAuthStore";
import { useDebounce } from "./use-debounce";

export function useRoles() {
  const selectedTenantId = useAuthStore((s) => s.selectedTenantId);

  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [originalPermIds, setOriginalPermIds] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const debouncedQuery = useDebounce(query, 300);

  // --- Carrega roles do tenant selecionado ---
  const loadRoles = useCallback(async () => {
    if (!selectedTenantId) {
      setRoles([]);
      return;
    }
    setRolesLoading(true);
    try {
      const data = await RolesAPI.list(selectedTenantId);
      setRoles(data);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(`Erro ao carregar papéis (${err.status})`);
      } else {
        toast.error("Erro ao carregar papéis");
      }
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }, [selectedTenantId]);

  // --- Carrega catálogo de permissions (uma vez) ---
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const data = await PermissionsAPI.list();
      setCatalog(data);
    } catch {
      toast.error("Erro ao carregar catálogo de permissões");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // --- Carrega permissions marcadas de uma role ---
  const loadRolePermissions = useCallback(async (roleId: string) => {
    try {
      const data = await PermissionsAPI.byRole(roleId);
      const ids = new Set(data.map((p) => p.id));
      setSelectedPermIds(ids);
      setOriginalPermIds(new Set(ids));
    } catch {
      toast.error("Erro ao carregar permissões da role");
      setSelectedPermIds(new Set());
      setOriginalPermIds(new Set());
    }
  }, []);

  // Efeitos
  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    void loadRoles();
    setSelectedRoleId(null);
  }, [loadRoles]);

  // Auto-seleciona primeira role
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
    if (
      selectedRoleId &&
      !roles.find((r) => r.id === selectedRoleId)
    ) {
      setSelectedRoleId(roles[0]?.id ?? null);
    }
  }, [roles, selectedRoleId]);

  // Quando a role selecionada muda, carrega as permissions dela
  useEffect(() => {
    if (selectedRoleId) {
      void loadRolePermissions(selectedRoleId);
    } else {
      setSelectedPermIds(new Set());
      setOriginalPermIds(new Set());
    }
  }, [selectedRoleId, loadRolePermissions]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  // Árvore de permissões (agrupada em 2 níveis)
  const tree: DomainGroup[] = useMemo(() => {
    if (!debouncedQuery) return buildTree(catalog);
    const q = debouncedQuery.toLowerCase();
    const filtered = catalog.filter(
      (p) =>
        p.key.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q),
    );
    return buildTree(filtered);
  }, [catalog, debouncedQuery]);

  // --- Toggles ---
  const togglePerm = (id: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleResourceGroup = (perms: { id: string }[]) => {
    const ids = perms.map((p) => p.id);
    const allSelected = ids.every((id) => selectedPermIds.has(id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleDomainGroup = (domains: { permissions: { id: string }[] }[]) => {
    const ids = domains.flatMap((r) => r.permissions.map((p) => p.id));
    const allSelected = ids.every((id) => selectedPermIds.has(id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const expandAll = () => {
    const state: Record<string, boolean> = {};
    for (const domain of tree) {
      state[domain.domain] = true;
      for (const resource of domain.resources) {
        state[`${domain.domain}.${resource.resource}`] = true;
      }
    }
    setOpenGroups(state);
  };

  const collapseAll = () => setOpenGroups({});

  const selectAll = () => {
    setSelectedPermIds(new Set(catalog.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedPermIds(new Set());
  };

  const reset = () => {
    setSelectedPermIds(new Set(originalPermIds));
  };

  const isDirty = useMemo(() => {
    if (selectedPermIds.size !== originalPermIds.size) return true;
    for (const id of selectedPermIds) {
      if (!originalPermIds.has(id)) return true;
    }
    return false;
  }, [selectedPermIds, originalPermIds]);

  // --- Salvar ---
  const save = async () => {
    if (!selectedRoleId) return;
    if (!isDirty) {
      toast.info("Nada para salvar");
      return;
    }

    setSaving(true);
    try {
      const result = await RolesAPI.setPermissions(
        selectedRoleId,
        [...selectedPermIds],
      );
      toast.success(
        `Salvo (${result.added} adicionadas, ${result.removed} removidas)`,
      );
      await loadRoles();
      await loadRolePermissions(selectedRoleId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Sem permissão para editar papéis");
      } else {
        toast.error("Erro ao salvar permissões");
      }
    } finally {
      setSaving(false);
    }
  };

  // --- CRUD ---
  const createRole = async (input: {
    name: string;
    description?: string;
  }) => {
    if (!selectedTenantId) {
      toast.error("Nenhum tenant selecionado");
      return null;
    }
    try {
      const role = await RolesAPI.create({
        name: input.name,
        description: input.description,
        tenantId: selectedTenantId,
      });
      toast.success("Papel criado");
      await loadRoles();
      setSelectedRoleId(role.id);
      return role;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Já existe um papel com esse nome");
      } else {
        toast.error("Erro ao criar papel");
      }
      return null;
    }
  };

  const updateRole = async (
    id: string,
    input: { name: string; description?: string },
  ) => {
    try {
      await RolesAPI.update(id, input);
      toast.success("Papel atualizado");
      await loadRoles();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Já existe um papel com esse nome");
      } else {
        toast.error("Erro ao atualizar papel");
      }
    }
  };

  const deleteRole = async (id: string) => {
    try {
      await RolesAPI.remove(id);
      toast.success("Papel removido");
      if (selectedRoleId === id) setSelectedRoleId(null);
      await loadRoles();
    } catch {
      toast.error("Erro ao remover papel");
    }
  };

  const toggleDomainOpen = (domain: string) => {
    setOpenGroups((s) => ({ ...s, [domain]: !s[domain] }));
  };

  const toggleResourceOpen = (domain: string, resource: string) => {
    const key = `${domain}.${resource}`;
    setOpenGroups((s) => ({ ...s, [key]: !s[key] }));
  };

  return {
    // Dados
    roles,
    catalog,
    tree,
    selectedRole,
    selectedRoleId,
    setSelectedRoleId,

    // Loading
    rolesLoading,
    catalogLoading,
    saving,

    // Seleção
    selectedPermIds,
    isPermChecked: (id: string) => selectedPermIds.has(id),
    togglePerm,
    toggleResourceGroup,
    toggleDomainGroup,
    selectAll,
    deselectAll,
    reset,
    isDirty,

    // Busca e accordion
    query,
    setQuery,
    openGroups,
    toggleDomainOpen,
    toggleResourceOpen,
    expandAll,
    collapseAll,

    // Ações
    save,
    createRole,
    updateRole,
    deleteRole,
  };
}