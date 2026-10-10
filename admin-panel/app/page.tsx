"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/useAuthStore";

export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const bootstrapUser = useAuthStore((s) => s.bootstrapUser);

  useEffect(() => {
    if (!useAuthStore.getState().user) {
      void bootstrapUser();
    }
  }, [bootstrapUser]);

  useEffect(() => {
    if (isBootstrapping) return;

    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [isBootstrapping, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Carregando...
    </div>
  );
}