"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { CrudModal } from "@/components/shared/crud-modal";
import { Input } from "@/components/ui/input";
import { CanButton, CanGhostButton } from "@/components/shared/can-button";
import { ApiError } from "@/lib/api";
import { TenantsAPI, type Tenant } from "@/lib/api/tenants";
import { ThemesAPI, type ThemeSummary } from "@/lib/api/themes";
import { toast } from "sonner";
import { useConfirm } from "@/lib/confirm-context";
import { Card } from "@/components/ui/card";

export default function TenantsPage() {
  const confirm = useConfirm();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<Partial<Tenant> | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantsData, themesData] = await Promise.all([
        TenantsAPI.list(),
        ThemesAPI.list().catch(() => [] as ThemeSummary[]),
      ]);
      setTenants(tenantsData);
      setThemes(themesData);
    } catch (err) {
      toast.error("Erro ao carregar tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => {
    if (modal) {
      setSelectedThemeId(modal.themeId || modal.theme?.id || "");
    }
  }, [modal]);

  const filtered = tenants.filter(
    (t) => t.name.toLowerCase().includes(q.toLowerCase()) || t.slug.toLowerCase().includes(q.toLowerCase()),
  );

  async function handleSave() {
    const name = (document.getElementById("t-name") as HTMLInputElement)?.value;
    const licenseExpiresAt = (document.getElementById("t-license") as HTMLInputElement)?.value;

    if (!name) { toast.error("Nome é obrigatório"); return; }
    if (!licenseExpiresAt) { toast.error("Data de expiração é obrigatória"); return; }

    const licenseISO = new Date(licenseExpiresAt).toISOString();
    const themeIdToSave = selectedThemeId || null;

    try {
      if (modal?.id) {
        await TenantsAPI.update(modal.id, { name, licenseExpiresAt: licenseISO } as any);
        await TenantsAPI.updateTheme(modal.id, themeIdToSave);
        toast.success("Tenant atualizado");
      } else {
        const created = await TenantsAPI.create({ name, licenseExpiresAt: licenseISO } as any);
        if (themeIdToSave) {
          await TenantsAPI.updateTheme(created.id, themeIdToSave);
        }
        toast.success("Tenant criado");
      }
      setModal(null);
      await loadAll();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) toast.error("Já existe um tenant com esse nome");
        else if (err.status === 403) toast.error("Sem permissão");
        else toast.error(`Erro (${err.status})`);
      } else {
        toast.error("Erro ao salvar");
      }
    }
  }

  async function handleDelete(id: string) {
    const tenant = tenants.find((t) => t.id === id);
    const ok = await confirm({
      title: "Deletar tenant?",
      description: tenant ? `O tenant "${tenant.name}" será removido.` : "O tenant será removido.",
      confirmLabel: "Deletar",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await TenantsAPI.remove(id);
      toast.success("Tenant removido");
      await loadAll();
    } catch {
      toast.error("Erro ao remover");
    }
  }

  function getStatus(t: Tenant) {
    const expiresAt = new Date(t.licenseExpiresAt).getTime();
    const now = Date.now();
    if (expiresAt < now) return { label: "expirado", color: "bg-red-100 text-red-700" };
    const daysLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 30) return { label: "expira em breve", color: "bg-amber-100 text-amber-700" };
    return { label: "ativo", color: "bg-emerald-100 text-emerald-700" };
  }

  return (
    <div className="p-6 space-y-4 min-h-full bg-transparent">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inquilinos</h1>
          <p className="text-sm text-muted-foreground mt-1">{tenants.length} tenant(s) cadastrado(s)</p>
        </div>
        <CanButton permission="platform.tenants.create" onClick={() => setModal({})}>+ Novo Inquilino</CanButton>
      </div>

      <div className="max-w-sm">
        <SearchInput value={q} onChange={setQ} placeholder="Buscar tenants..." />
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum tenant encontrado.</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((t) => {
            const status = getStatus(t);
            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-violet-600">
                    {t.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.slug}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Tema: <span className="font-medium text-foreground">{t.theme?.name || t.themeId || "padrão"}</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded ${status.color}`}>{status.label}</span>
                  <span className="text-muted-foreground">expira em {new Date(t.licenseExpiresAt).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <CanGhostButton permission="platform.tenants.update" onClick={() => setModal(t)}>Editar</CanGhostButton>
                  <CanGhostButton permission="platform.tenants.delete" onClick={() => handleDelete(t.id)} className="border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">Deletar</CanGhostButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CrudModal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? "Editar Tenant" : "Novo Tenant"} onSave={handleSave}>
        <div className="space-y-3">
          <Input id="t-name" defaultValue={modal?.name ?? ""} placeholder="Nome" />
          <Input id="t-license" type="date" defaultValue={modal?.licenseExpiresAt ? new Date(modal.licenseExpiresAt).toISOString().slice(0, 10) : ""} />
          <div>
            <label className="text-xs text-muted-foreground">Tema</label>
            <select
              value={selectedThemeId}
              onChange={(e) => setSelectedThemeId(e.target.value)}
              className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Padrão (sem tema)</option>
              {themes.map((th) => (
                <option key={th.id} value={th.id}>{th.name} ({th.slug})</option>
              ))}
            </select>
          </div>
        </div>
      </CrudModal>
    </div>
  );
}