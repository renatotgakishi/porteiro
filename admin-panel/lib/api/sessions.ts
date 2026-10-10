import { api } from "../api";

export type GeoLocation = {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
};

export type SessionItem = {
  id: string;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  geo: GeoLocation;
};

export type SessionAnomalyLevel = "none" | "warn" | "danger";

export type SessionChain = {
  chainId: string;
  sessions: SessionItem[];
  anomalyLevel: SessionAnomalyLevel;
  anomalyReason: string | null;
};

export type SessionsListResponse = {
  userId: string;
  chains: SessionChain[];
  total: number;
  activeCount: number;
};

export const SessionsAPI = {
  list: (userId: string) =>
    api<SessionsListResponse>(`/users/${userId}/sessions`),

  revokeOne: (userId: string, sessionId: string) =>
    api<void>(`/users/${userId}/sessions/${sessionId}`, {
      method: "DELETE",
    }),

  revokeAll: (userId: string) =>
    api<number>(`/users/${userId}/sessions`, { method: "DELETE" }),
};