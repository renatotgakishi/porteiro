"use client";

import { useState } from "react";
import { useRoles } from "@/hooks/use-roles";
import { useAuthStore } from "@/stores/useAuthStore";
import { RoleList } from "@/components/roles/role-list";
import { PermissionToolbar } from "@/components/permissions/permission-toolbar";
import { PermissionDomainAccordion } from "@/components/permissions/permission-domain-accordion";
import { PermissionFooter } from "@/components/permissions/permission-footer";
import { CrudModal } from "@/components/shared/crud-modal";
import { Input } from "@/components/ui/input";
import { CanButton } from "@/components/shared/can-button";
import type { Role } from "@/lib/api/roles";
import { useConfirm } from "@/lib/confirm-context";

export default function RolesPage() {
  const confirm = useConfirm();

  const {
    roles,
    tree,
    selectedRole,
    selectedRoleId,
    setSelectedRoleId,
    selectedPermIds,
    query,
    setQuery,
    openGroups,
    toggleDomainOpen,
    toggleResourceOpen,
    togglePerm,
    toggleDomainGroup,
    toggleResourceGroup,
    isPermChecked,
    reset,
    save,
    isDirty,
    saving,
    createRole,
    updateRole,
    deleteRole,
    expandAll,
    collapseAll,
    selectAll,
  } = useRoles();

  const availableTenants = useAuthStore((s) => s.availableTenants);
  const selectedTenantId = useAuthStore((s) => s.selectedTenantId);
  const currentTenant = availableTenants.find((t) => t.id === selectedTenantId);

  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; role: Role }
    | null
  >(null);

  const totalGroups = tree.length;

  async function handleSaveModal() {
    const nameInput = document.getElementById("role-name") as HTMLInputElement;
    const descInput = document.getElementById("role-description") as HTMLInputElement;

    const name = nameInput?.value?.trim();
    const description = descInput?.value?.trim() || undefined;

    if (!name) return;

    if (modal?.mode === "create") {
      await createRole({ name, description });
    } else if (modal?.mode === "edit" && modal.role) {
      await updateRole(modal.role.id, { name, description });
    }

    setModal(null);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Remover papel?",
      description: "O papel será removido e os usuários que o possuem perderão as permissões associadas.",
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!ok) return;
    await deleteRole(id);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="shrink-0 p-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Papéis & Permissões
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {roles.length} papéis
            {selectedRole && (
              <>
                {" "}
                • {selectedRole.name} • {selectedPermIds.size} permissões
              </>
            )}
          </p>
        </div>
        <CanButton
          permission="iam.roles.create"
          onClick={() => setModal({ mode: "create" })}
        >
          + Novo Papel
        </CanButton>
      </div>

      <div className="flex flex-1 gap-6 p-6 pt-2 overflow-hidden">
        <RoleList
          roles={roles}
          selectedRoleId={selectedRoleId}
          tenantName={currentTenant?.name ?? "—"}
          onSelect={setSelectedRoleId}
          onCreate={() => setModal({ mode: "create" })}
          onEdit={(role) => setModal({ mode: "edit", role })}
          onDelete={handleDelete}
        />

        {/* Card de permissões */}
        <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <PermissionToolbar
            query={query}
            setQuery={setQuery}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onSelectAll={selectAll}
          />

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background">
            {tree.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">
                Nenhuma permissão encontrada.
              </p>
            ) : (
              tree.map((domain) => (
                <PermissionDomainAccordion
                  key={domain.domain}
                  domain={domain}
                  isOpen={openGroups[domain.domain] ?? false}
                  onToggle={() => toggleDomainOpen(domain.domain)}
                  openGroups={openGroups}
                  onToggleResource={toggleResourceOpen}
                  isPermChecked={isPermChecked}
                  onTogglePerm={togglePerm}
                  onToggleResourceGroup={toggleResourceGroup}
                  onToggleDomainGroup={toggleDomainGroup}
                />
              ))
            )}
            <div className="h-2" />
          </div>

          <PermissionFooter
            selectedCount={selectedPermIds.size}
            groupsCount={totalGroups}
            saving={saving}
            isDirty={isDirty}
            onReset={reset}
            onSave={save}
          />
        </div>
      </div>

      <CrudModal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Editar Papel" : "Novo Papel"}
        onSave={handleSaveModal}
      >
        <div className="space-y-3">
          <Input
            id="role-name"
            defaultValue={
              modal?.mode === "edit" ? modal.role.name : ""
            }
            placeholder="Nome do papel"
          />
          <Input
            id="role-description"
            defaultValue={
              modal?.mode === "edit"
                ? modal.role.description ?? ""
                : ""
            }
            placeholder="Descrição (opcional)"
          />
        </div>
      </CrudModal>
    </div>
  );
}