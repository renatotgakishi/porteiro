const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}`);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

// Promise compartilhada do refresh em andamento.
// Garante que só uma chamada a /auth/refresh aconteça por vez.
let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function rawFetch(
  path: string,
  options: RequestOptions,
  allowRetry: boolean,
): Promise<Response> {
  const { body, headers, ...rest } = options;

  const finalHeaders = new Headers(headers ?? {});

  let finalBody: BodyInit | undefined;

  if (body !== undefined) {
    if (body instanceof FormData) {
      finalBody = body;
      // FormData define o Content-Type automaticamente com boundary.
    } else {
      finalHeaders.set("Content-Type", "application/json");
      finalBody = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    body: finalBody,
    headers: finalHeaders,
    credentials: "include",
  });

  // Se 401 e não é a própria rota de refresh, tenta refresh uma vez.
  if (
    res.status === 401 &&
    allowRetry &&
    !path.startsWith("/auth/refresh")
  ) {
    const refreshed = await refreshOnce();

    if (refreshed) {
      // Repete a request original (sem permitir novo retry).
      return rawFetch(path, options, false);
    }

    // Refresh falhou: limpa o estado e manda para o login.
    // Import dinâmico para evitar dependência circular entre módulos.
    const { useAuthStore } = await import("@/stores/useAuthStore");
    useAuthStore.getState().clear();
    redirectToLogin();
  }

  return res;
}

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res = await rawFetch(path, options, true);

  const parsed = await parseBody(res);

  if (!res.ok) {
    throw new ApiError(res.status, parsed);
  }

  return parsed as T;
}