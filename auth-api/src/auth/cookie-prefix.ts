import type { Request } from 'express';

/**
 * Prefixos de cookie por aplicacao.
 *
 * Motivo: o browser ignora porta pra cookies. `localhost:3001` e
 * `localhost:4001` compartilham cookie jar. Se os dois usam
 * `access_token`, um sobrescreve o outro.
 *
 * Solucao: cada app tem seu prefixo. O backend detecta a origem
 * da requisicao (header `Origin`) e usa o prefixo certo.
 */
export type ClientPrefix = 'admin_' | 'starter_' | '';

/**
 * Origens conhecidas -> prefixo de cookie.
 * Ajustar aqui quando criar starter-kit-2, starter-kit-3, etc.
 */
const ORIGIN_TO_PREFIX: Record<string, ClientPrefix> = {
  'http://localhost:3001': 'admin_',
  'http://localhost:4001': 'starter_',
};

/**
 * Detecta o prefixo de cookie a partir do header `Origin`.
 *
 * - Requisicoes cross-origin (frontends em :3001/:4001 chamando :3000)
 *   sempre mandam `Origin`. E o caso normal.
 * - Se `Origin` nao vier (curl, Swagger, same-origin), devolve '' —
 *   o guard cai no fallback `access_token` (sem prefixo).
 * - OAuth callback NAO passa por aqui (e navegacao top-level, sem
 *   Origin). O oauth.controller hardcoda 'starter_' explicitamente.
 */
export function detectClientPrefix(req: Request): ClientPrefix {
  const origin = req.headers.origin;

  if (typeof origin !== 'string' || origin.length === 0) {
    return '';
  }

  return ORIGIN_TO_PREFIX[origin] ?? '';
}

/**
 * Nomes completos dos cookies, dado um prefixo.
 * Ex: prefix='admin_' -> 'admin_access_token', 'admin_refresh_token'
 */
export function accessCookieName(prefix: ClientPrefix): string {
  return `${prefix}access_token`;
}

export function refreshCookieName(prefix: ClientPrefix): string {
  return `${prefix}refresh_token`;
}