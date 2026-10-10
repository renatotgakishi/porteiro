"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Monitor,
  Smartphone,
  ShieldAlert,
} from "lucide-react";

import type { SessionChain, SessionItem } from "@/lib/api/sessions";

type Props = {
  chain: SessionChain;
  revoking: boolean;
  onRevoke: (sessionId: string) => void;
  forceExpanded?: boolean;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

/**
 * Adivinha o dispositivo a partir do userAgent. Não é ciência exata —
 * é só pra dar um ícone e um rótulo humano.
 */
function deviceOf(userAgent: string | null): {
  label: string;
  icon: "desktop" | "mobile";
} {
  if (!userAgent) return { label: "Desconhecido", icon: "desktop" };
  const ua = userAgent.toLowerCase();
  if (/android|iphone|ipad|mobile/.test(ua)) {
    return { label: "Mobile", icon: "mobile" };
  }
  if (/windows/.test(ua)) return { label: "Windows", icon: "desktop" };
  if (/mac os|macintosh/.test(ua)) return { label: "macOS", icon: "desktop" };
  if (/linux/.test(ua)) return { label: "Linux", icon: "desktop" };
  return { label: "Desktop", icon: "desktop" };
}

/**
 * Extrai um nome de navegador legível do userAgent.
 */
function browserOf(userAgent: string | null): string {
  if (!userAgent) return "—";
  const ua = userAgent;
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  if (/curl\//i.test(ua)) return "curl";
  return "—";
}

function locationOf(session: SessionItem): string {
  const parts: string[] = [];
  if (session.geo.city) parts.push(session.geo.city);
  if (session.geo.region && session.geo.region !== session.geo.city) {
    parts.push(session.geo.region);
  }
  if (session.geo.country) parts.push(session.geo.country);
  if (parts.length === 0) return session.ipAddress ?? "Local";
  return parts.join(", ");
}

export function SessionChainItem({
  chain,
  revoking,
  onRevoke,
  forceExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(forceExpanded);

  // Sessões ativas dentro da cadeia
  const activeSessions = chain.sessions.filter((s) => s.isActive);
  const revokedSessions = chain.sessions.filter((s) => !s.isActive);

  // A "ponta" da cadeia é a última sessão criada (mais recente)
  const sorted = [...chain.sessions].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const head = sorted[0];

  if (!head) return null;

  const device = deviceOf(head.userAgent);
  const browser = browserOf(head.userAgent);
  const location = locationOf(head);

  const DeviceIcon = device.icon === "mobile" ? Smartphone : Monitor;

  // Só mostra o botão de revogar se tiver sessão ativa
  const hasActive = activeSessions.length > 0;

  // Tem anomalia?
  const hasAnomaly = chain.anomalyLevel !== "none";

  return (
    <div
      className={`border rounded-xl overflow-hidden ${
        chain.anomalyLevel === "danger"
          ? "border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20"
          : chain.anomalyLevel === "warn"
            ? "border-amber-300 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/10"
            : "border-border bg-card"
      }`}
    >
      {/* Cabeçalho da cadeia */}
      <div className="flex items-start gap-3 p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>

        <DeviceIcon
          size={20}
          className="mt-0.5 text-muted-foreground shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">
              {device.label} · {browser}
            </p>
            {head.isCurrent && (
              <span className="text-[10px] uppercase font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/60">
                Esta sessão
              </span>
            )}
            {!hasActive && (
              <span className="text-[10px] uppercase font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">
                Encerrada
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {location} · criada em {formatDateTime(head.createdAt)}
            {head.lastUsedAt && ` · usada ${relativeTime(head.lastUsedAt)}`}
          </p>

          {chain.sessions.length > 1 && !expanded && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {chain.sessions.length} rotações nesta cadeia
            </p>
          )}

          {/* Badge de anomalia */}
          {hasAnomaly && (
            <div
              className={`mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${
                chain.anomalyLevel === "danger"
                  ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/60"
                  : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60"
              }`}
            >
              {chain.anomalyLevel === "danger" ? (
                <ShieldAlert size={12} />
              ) : (
                <AlertTriangle size={12} />
              )}
              <span className="font-medium">
                {chain.anomalyLevel === "danger"
                  ? "Possível vazamento"
                  : "IP mudou rapidamente"}
              </span>
              {chain.anomalyReason && (
                <span className="opacity-75">— {chain.anomalyReason}</span>
              )}
            </div>
          )}
        </div>

        {hasActive && (
          <button
            type="button"
            disabled={revoking}
            onClick={() => onRevoke(head.id)}
            className="text-xs px-3 py-1.5 rounded-full border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50 shrink-0"
          >
            Revogar
          </button>
        )}
      </div>

      {/* Lista de rotações dentro da cadeia */}
      {expanded && chain.sessions.length > 0 && (
        <div className="border-t border-border/60 bg-muted/30">
          <ul className="divide-y divide-border/60">
            {sorted.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-3 py-2 text-xs"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    s.isActive
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/40"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground">
                    {formatDateTime(s.createdAt)}
                    {s.revokedReason && (
                      <span className="ml-2 opacity-75">
                        ({s.revokedReason})
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 truncate">
                    {locationOf(s)} · {s.ipAddress ?? "—"}
                  </p>
                </div>
                {s.isActive && (
                  <button
                    type="button"
                    disabled={revoking}
                    onClick={() => onRevoke(s.id)}
                    className="text-[11px] px-2 py-1 rounded-full border border-border hover:bg-muted transition disabled:opacity-50"
                  >
                    Revogar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Nota quando só tem revogadas */}
      {!hasActive && revokedSessions.length > 0 && !expanded && (
        <div className="border-t border-border/60 bg-muted/20 px-3 py-1.5">
          <p className="text-[11px] text-muted-foreground">
            {revokedSessions.length}{" "}
            {revokedSessions.length === 1 ? "sessão" : "sessões"}{" "}
            revogada{revokedSessions.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}