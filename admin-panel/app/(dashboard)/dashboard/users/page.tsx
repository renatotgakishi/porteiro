"use client";

import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";

import { useUsers } from "@/hooks/use-users";
import { useAuthStore } from "@/stores/useAuthStore";
import { CanButton } from "@/components/shared/can-button";
import { UserModal } from "@/components/users/user-modal";
import { UserListItem } from "@/components/users/user-list-item";
import { SessionsModal } from "@/components/sessions/session-modal";
import type { User } from "@/lib/api/users";
import { useConfirm } from "@/lib/confirm-context";
import { Card } from "@/components/ui/card";

export default function UsersPage() {
  const { users, roles, loading, saving, createUser, updateUser, deleteUser, inviteUser } = useUsers();
  const confirm = useConfirm();

  const availableTenants = useAuthStore((s) => s.availableTenants);
  const selectedTenantId = useAuthStore((s) => s.selectedTenantId);
  const currentTenant = availableTenants.find((t) => t.id === selectedTenantId);

  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; user: User } | null>(null);
  const [sessionsUser, setSessionsUser] = useState<User | null>(null);

  const filtered = useMemo(() => {
    const lower = q.toLowerCase();
    return users.filter((u) => (u.name ?? "").toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower));
  }, [users, q]);

  async function handleSave(data: { name: string; email: string; password?: string; roleIds: string[] }) {
    if (modal?.mode === "create") {
      const ok = await createUser({ name: data.name || undefined, email: data.email, password: data.password ?? "123456", roleIds: data.roleIds });
      if (ok) setModal(null);
    } else if (modal?.mode === "edit" && modal.user) {
      const ok = await updateUser(modal.user.id, { name: data.name || undefined, email: data.email, roleIds: data.roleIds });
      if (ok) setModal(null);
    }
  }

  async function handleDelete(user: User) {
    const ok = await confirm({ title: `Deletar usuário?`, description: `O usuário ${user.email} será removido. Essa ação não pode ser desfeita.`, confirmLabel: "Deletar", variant: "danger" });
    if (!ok) return;
    await deleteUser(user.id);
  }

  async function handleInvite(user: User) {
    const ok = await confirm({ title: "Enviar convite?", description: `Um email será enviado para ${user.email} com um link para definir a senha.`, confirmLabel: "Enviar", variant: "default" });
    if (!ok) return;
    await inviteUser(user.id);
  }

  return (
    <div className="p-6 space-y-4 min-h-full bg-transparent">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Usuários & Cargos</h1>
          <p className="text-sm text-muted-foreground mt-1">{users.length} usuário(s) em {currentTenant?.name ?? "—"}</p>
        </div>
        <CanButton permission="iam.users.create" onClick={() => setModal({ mode: "create" })}>+ Novo Usuário</CanButton>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou email..." className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-sm" />
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="p-3 text-left font-medium">Usuário</th>
                <th className="p-3 text-left font-medium">Cargos</th>
                <th className="p-3 text-left font-medium">Último acesso</th>
                <th className="p-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <UserListItem key={u.id} user={u} onEdit={() => setModal({ mode: "edit", user: u })} onDelete={() => handleDelete(u)} onViewSessions={() => setSessionsUser(u)} onInvite={() => handleInvite(u)} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <UserModal open={!!modal} mode={modal?.mode ?? "create"} user={modal?.mode === "edit" ? modal.user : null} roles={roles} saving={saving} onClose={() => setModal(null)} onSave={handleSave} />
      <SessionsModal open={!!sessionsUser} user={sessionsUser} onClose={() => setSessionsUser(null)} />
    </div>
  );
}