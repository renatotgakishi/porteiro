"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Palette, Copy, Trash2, Check, Plus, Eye, Sparkles, Layers, Box } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { ThemeDefinition } from "@/stores/useThemeStore";
import { ThemesAPI } from "@/lib/api/themes";
import { ApiError } from "@/lib/api";

function StyleBadge({ style }: { style: string }) {
  const map: Record<string, { label: string; icon: any }> = {
    flat: { label: "Flat", icon: Layers },
    glass: { label: "Glass", icon: Sparkles },
    neumorphism: { label: "Neumorphism", icon: Box },
  };
  const s = map[style] || map.flat;
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border bg-muted/60">
      <Icon size={12} /> {s.label}
    </span>
  );
}

function MiniPreview({ theme }: { theme: ThemeDefinition }) {
  const bg = theme.backgroundLight;
  const hasImage = bg.type === 'image' &&!!bg.image?.url;
  const hasGradient = bg.type === 'gradient' &&!!bg.gradient?.from;
  const bgStyle: React.CSSProperties = hasImage
 ? { backgroundImage: `url(${bg.image!.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : hasGradient
 ? { backgroundImage: `linear-gradient(135deg, ${bg.gradient!.from}, ${bg.gradient!.to})` }
    : { backgroundColor: `hsl(${theme.colorsLight.bg})` };

  const isGlass = theme.style === 'glass';
  const cardStyle: React.CSSProperties = isGlass
 ? { background: `rgba(255,255,255,${(theme.glassConfig?.opacityLight || 68) / 100})`, backdropFilter: `blur(${theme.glassConfig?.blur || 24}px)`, borderTop: '1px solid rgba(255,255,255,0.5)' }
    : theme.style === 'neumorphism'
 ? { background: `hsl(${theme.colorsLight.bgCard})`, boxShadow: `8px 8px 16px rgba(209,197,184,0.9), -8px -8px 16px rgba(255,255,255,0.9)`, border: '1px solid transparent' }
    : { backgroundColor: `hsl(${theme.colorsLight.bgCard})`, borderColor: `hsl(${theme.colorsLight.border})` };

  return (
    <div className="h-24 rounded-xl overflow-hidden border border-border relative" style={bgStyle}>
      {isGlass && <div className="absolute inset-0 bg-white/40" />}
      <div className="absolute inset-2 rounded-lg border p-2 flex flex-col justify-between" style={cardStyle}>
        <div className="h-2 w-12 rounded-full" style={{ background: `hsl(${theme.colorsLight.primary})` }} />
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full" style={{ background: `hsl(${theme.colorsLight.bgMuted})` }} />
          <div className="h-1.5 w-2/3 rounded-full" style={{ background: `hsl(${theme.colorsLight.bgMuted})` }} />
        </div>
      </div>
    </div>
  );
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);

  const load = async () => {
    try {
      const data = await ThemesAPI.list();
      setThemes(data);
    } catch {
      toast.error("Erro ao carregar temas");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDuplicate = async (theme: ThemeDefinition) => {
    const copy = {...theme, id: undefined, name: `${theme.name} cópia`, slug: `${theme.slug}-copy-${Date.now()}`, status: 'draft', dateAt: new Date().toISOString() } as any;
    delete copy.id;
    try {
      await ThemesAPI.create(copy);
      toast.success("Duplicado");
      load();
    } catch {
      toast.error("Erro ao duplicar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover tema do banco?")) return;
    try {
      await ThemesAPI.remove(id);
      toast.success("Removido");
      load();
    } catch (err) {
      if (err instanceof ApiError) toast.error(`Erro ${err.status}`);
      else toast.error("Erro");
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-full bg-transparent">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Palette size={20} /> Temas (banco)</h1>
          <p className="text-sm text-muted-foreground mt-1">Agora vem de <code className="bg-muted px-1 rounded text-xs">GET /themes</code> e salva em <code className="bg-muted px-1 rounded text-xs">themes</code> table</p>
        </div>
        <Link href="/dashboard/themes/novo" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-medium hover:opacity-90"><Plus size={16} /> Novo tema</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <Card key={theme.id} className="p-3 space-y-3">
            <MiniPreview theme={theme} />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{theme.name}</p>
                <p className="text-xs text-muted-foreground truncate">{theme.slug}</p>
              </div>
              <StyleBadge style={theme.style} />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${theme.status === 'published'? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{theme.status}</span>
              <span className="text-xs px-2 py-0.5 rounded-full border bg-muted/60">{theme.density}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Link href={`/dashboard/themes/${theme.id}`} className="flex-1 inline-flex justify-center border rounded-full px-3 py-2 text-xs">Editar</Link>
              <button onClick={() => handleDuplicate(theme)} className="w-8 h-8 rounded-full border flex items-center justify-center"><Copy size={14} /></button>
              <button onClick={() => handleDelete(theme.id)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}