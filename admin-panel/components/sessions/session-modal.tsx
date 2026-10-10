"use client";

import { useEffect } from "react";
import { Loader2, ShieldOff } from "lucide-react";

import type { User } from "@/lib/api/users";
import { useUserSessions } from "@/hooks/use-user-sessions";
import { useConfirm } from "@/lib/confirm-context";
import { SessionChainItem } from "./session-chain";

type Props = {
  open: boolean;
  user: User | null;
  onClose: () => void;
};

export function SessionsModal({ open, user, onClose }: Props) {
  const confirm = useConfirm();

  const {
    visibleChains,
    activeCount,
    loading,
    revoking,
    showRevoked,
    setShowRevoked,
    revokeOne,
    revokeAll,
  } = useUserSessions(open && user ? user.id : null);

  // Reseta o toggle de revogadas ao fechar/abrir
  useEffect(() => {
    if (!open) setShowRevoked(false);
  }, [open, setShowRevoked]);

  if (!open || !user) return null;

  const userName = user.name ?? user.email;

  async function handleRevokeAll() {
    const ok = await confirm({
      title: "Revogar todas as sessões?",
      description: `Todas as ${activeCount} sessões ativas de ${userName} serão encerradas.`,
      confirmLabel: "Revogar todas",
      variant: "danger",
    });
    if (ok) void revokeAll();
  }

  async function handleRevokeOne(sessionId: string) {
    const ok = await confirm({
      title: "Revogar sessão?",
      description:
        "O dispositivo perderá o acesso e precisará fazer login novamente.",
      confirmLabel: "Revogar",
      variant: "danger",
    });
    if (ok) void revokeOne(sessionId);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-2xl border border-border shadow-xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-foreground">
                Sessões de {userName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {loading
                  ? "Carregando..."
                  : `${activeCount} ${activeCount === 1 ? "sessão ativa" : "sessões ativas"}`}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              Fechar
            </button>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRevoked}
                onChange={(e) => setShowRevoked(e.target.checked)}
                className="rounded border-border"
              />
              Mostrar revogadas
            </label>

            <div className="flex-1" />

            {activeCount > 1 && (
              <button
                type="button"
                disabled={revoking}
                onClick={handleRevokeAll}
                className="text-xs px-3 py-1.5 rounded-full border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
              >
                Revogar todas
              </button>
            )}
          </div>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}

          {!loading && visibleChains.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ShieldOff
                size={28}
                className="text-muted-foreground/50 mb-2"
              />
              <p className="text-sm text-muted-foreground">
                {showRevoked
                  ? "Nenhuma sessão encontrada"
                  : "Nenhuma sessão ativa"}
              </p>
              {!showRevoked && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Marque "Mostrar revogadas" para ver o histórico
                </p>
              )}
            </div>
          )}

          {!loading &&
            visibleChains.map((chain) => (
              <SessionChainItem
                key={chain.chainId}
                chain={chain}
                revoking={revoking}
                onRevoke={handleRevokeOne}
              />
            ))}
        </div>
      </div>
    </div>
  );
}