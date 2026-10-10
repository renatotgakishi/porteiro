"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { api, ApiError } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/stores/useAuthStore";
import { PasswordInput } from "@/components/ui/password-input";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

// Em dev, pré-preenche com as credenciais de teste.
// TODO: remover quando o sistema entrar em produção.
const DEV_EMAIL = "admin@plataforma.com";
const DEV_PASSWORD = "123456";

type LoginResponse = {
  user: AuthUser;
  permissions: string[];
};

export default function LoginPage() {
  const [email, setEmail] = useState(DEV_EMAIL);
  const [password, setPassword] = useState(DEV_PASSWORD);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: parsed.data,
      });

      setSession({
        user: data.user,
        permissions: data.permissions,
      });

      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Email ou senha inválidos");
      } else {
        setError("Erro ao fazer login. Tente novamente.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fcfaf8] dark:bg-[#0c0a09]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 shadow-sm space-y-4"
      >
        <div className="w-10 h-10 bg-stone-900 dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center font-bold">
          A
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Acme Corp</h1>
        <p className="text-sm text-stone-500">
          Enterprise • acme - admin@plataforma.com / 123456
        </p>

        <input
          type="email"
          autoComplete="email"
          className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 bg-transparent text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />

        <PasswordInput
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-stone-900 dark:bg-white text-white dark:text-black rounded-xl py-2.5 font-medium text-sm disabled:opacity-60"
        >
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}