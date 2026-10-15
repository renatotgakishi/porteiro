"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ThemesAPI } from "@/lib/api/themes";
import { ThemeEditor } from "@/components/theme/theme-editor";
import type { ThemeDefinition } from "@/stores/useThemeStore";
import { toast } from "sonner";

export default function EditarTemaPage() {
  const params = useParams();
  const id = params.id as string;
  const [theme, setTheme] = useState<ThemeDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    ThemesAPI.get(id)
      .then(setTheme)
      .catch(() => toast.error("Tema não encontrado no banco"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  if (!theme) return <div className="p-6 text-sm text-muted-foreground">Tema {id} não encontrado. Volta pra lista.</div>;

  return <ThemeEditor initialTheme={theme} />;
}