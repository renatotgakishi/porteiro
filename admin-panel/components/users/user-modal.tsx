"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/api/roles";
import type { User } from "@/lib/api/users";
import { Card } from "@/components/ui/card";

type Mode = "create" | "edit";

type Props = {
  open: boolean;
  mode: Mode;
  user: User | null;
  roles: Role[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    email: string;
    password?: string;
    roleIds: string[];
  }) => Promise<void>;
};

export function UserModal({
  open,
  mode,
  user,
  roles,
  saving,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set(),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && user) {
      setName(user.name ?? "");
      setEmail(user.email);
      setPassword("");
      setSelectedRoleIds(new Set(user.roles.map((r) => r.id)));
    } else {
      setName("");
      setEmail("");
      setPassword("123456");
      setSelectedRoleIds(new Set());
    }
    setError("");
  }, [open, mode, user]);

  if (!open) return null;

  function toggleRole(roleId: string) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  async function handleSave() {
    setError("");

    if (!email.trim()) {
      setError("E-mail é obrigatório");
      return;
    }
    if (mode === "create" && !password) {
      setError("Senha é obrigatória");
      return;
    }

    const payload: {
      name: string;
      email: string;
      password?: string;
      roleIds: string[];
    } = {
      name: name.trim(),
      email: email.trim(),
      roleIds: [...selectedRoleIds],
    };

    if (mode === "create") {
      payload.password = password;
    }

    await onSave(payload);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="p-6 w-full max-w-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-sm text-foreground">
          {mode === "edit" ? "Editar Usuário" : "Novo Usuário"}
        </h2>

        <div className="space-y-3 mt-4">
          <div>
            <label className="text-xs text-muted-foreground">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (opcional)"
              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              type="email"
              className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
            />
          </div>

          {mode === "create" && (
            <div>
              <label className="text-xs text-muted-foreground">Senha</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha (padrão: 123456)"
                type="text"
                className="w-full mt-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O usuário poderá trocar a senha no primeiro login.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground">Cargos</label>
            {roles.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum cargo disponível neste tenant.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {roles.map((r) => {
                  const selected = selectedRoleIds.has(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition ${selected
                          ? "bg-stone-900 text-white dark:bg-white dark:text-black border-stone-900 dark:border-white"
                          : "bg-background border-border hover:bg-muted"
                        }`}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-border rounded-full text-sm hover:bg-muted transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Card>
    </div>
  );
}