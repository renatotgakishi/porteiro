"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  SessionsAPI,
  type SessionChain,
  type SessionsListResponse,
} from "@/lib/api/sessions";

export function useUserSessions(userId: string | null) {
  const [data, setData] = useState<SessionsListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setData(null);
      return;
    }

    setLoading(true);
    try {
      const res = await SessionsAPI.list(userId);
      setData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          toast.error("Sem permissão para ver sessões");
        } else if (err.status === 404) {
          toast.error("Usuário não encontrado");
        } else {
          toast.error(`Erro ao carregar sessões (${err.status})`);
        }
      } else {
        toast.error("Erro ao carregar sessões");
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revokeOne(sessionId: string) {
    if (!userId) return false;
    setRevoking(true);
    try {
      await SessionsAPI.revokeOne(userId, sessionId);
      toast.success("Sessão revogada");
      await load();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Sem permissão");
      } else {
        toast.error("Erro ao revogar sessão");
      }
      return false;
    } finally {
      setRevoking(false);
    }
  }

  async function revokeAll() {
    if (!userId) return false;
    setRevoking(true);
    try {
      await SessionsAPI.revokeAll(userId);
      toast.success("Todas as sessões foram revogadas");
      await load();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Sem permissão");
      } else {
        toast.error("Erro ao revogar sessões");
      }
      return false;
    } finally {
      setRevoking(false);
    }
  }

  /**
   * Aplica o filtro de revogadas em cima das chains vindas da API.
   * Se showRevoked = false, remove sessões com revokedAt !== null.
   * Se uma chain ficar vazia, ela some.
   */
  const visibleChains: SessionChain[] = data
    ? data.chains
        .map((chain) => ({
          ...chain,
          sessions: showRevoked
            ? chain.sessions
            : chain.sessions.filter((s) => s.revokedAt === null),
        }))
        .filter((chain) => chain.sessions.length > 0)
    : [];

  const activeCount = data
    ? data.chains.reduce(
        (acc, c) => acc + c.sessions.filter((s) => s.isActive).length,
        0,
      )
    : 0;

  return {
    data,
    visibleChains,
    activeCount,
    loading,
    revoking,
    showRevoked,
    setShowRevoked,
    revokeOne,
    revokeAll,
    reload: load,
  };
}