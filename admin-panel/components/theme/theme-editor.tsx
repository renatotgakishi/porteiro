"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { type ThemeDefinition, defaultTheme } from "@/stores/useThemeStore";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, Monitor, Palette, Image as ImageIcon, X } from "lucide-react";
import { ThemesAPI } from "@/lib/api/themes";


function hslStrToHex(hsl: string): string {
  try {
    const [h, s, l] = hsl.split(' ').map(v => parseFloat(v));
    const sN = s / 100, lN = l / 100;
    const c = (1 - Math.abs(2 * lN - 1)) * sN;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = lN - c / 2;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) { r = c; g = x; b = 0 } else if (60 <= h && h < 120) { r = x; g = c; b = 0 } else if (120 <= h && h < 180) { r = 0; g = c; b = x } else if (180 <= h && h < 240) { r = 0; g = x; b = c } else if (240 <= h && h < 300) { r = x; g = 0; b = c } else { r = c; g = 0; b = x }
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch { return '#111111'; }
}
function hexToHslStr(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) { const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min); switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; }h /= 6; }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
function hslToRgba(hsl: string, alpha: number) {
  const hex = hslStrToHex(hsl);
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function ae(hexOrHsl: string, opacity: number) {
  if (hexOrHsl.includes(' ')) return hslToRgba(hexOrHsl, opacity);
  if (!hexOrHsl.startsWith('#')) return hexOrHsl;
  const r = parseInt(hexOrHsl.slice(1, 3), 16), g = parseInt(hexOrHsl.slice(3, 5), 16), b = parseInt(hexOrHsl.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = useMemo(() => hslStrToHex(value), [value]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-14">{label}</span>
      <input type="color" value={hex} onChange={e => onChange(hexToHslStr(e.target.value))} className="w-8 h-8 rounded-lg border p-0.5 cursor-pointer shrink-0" />
      <input value={value} onChange={e => onChange(e.target.value)} className="flex-1 border rounded-xl px-2 py-1.5 text- font-mono bg-background" />
    </div>
  );
}

export function ThemeEditor({ initialTheme }: { initialTheme?: ThemeDefinition }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [theme, setTheme] = useState<ThemeDefinition>(() => initialTheme || {
    ...defaultTheme,
    id: `theme_${Date.now()}`,
    name: "Novo tema",
    slug: `novo-tema-${Date.now()}`,
    status: 'draft' as const,
    dateAt: new Date().toISOString(),
  });
  useEffect(() => { if (initialTheme) setTheme(initialTheme); }, [initialTheme]);

  const [lightMode, setLightMode] = useState(true);
  const colors = lightMode ? theme.colorsLight : theme.colorsDark;
  const bg = lightMode ? theme.backgroundLight : theme.backgroundDark;

  const setColors = (p: any) => lightMode ? setTheme(t => ({ ...t, colorsLight: { ...t.colorsLight, ...p } })) : setTheme(t => ({ ...t, colorsDark: { ...t.colorsDark, ...p } }));
  const setBg = (p: any) => lightMode ? setTheme(t => ({ ...t, backgroundLight: { ...t.backgroundLight, ...p } })) : setTheme(t => ({ ...t, backgroundDark: { ...t.backgroundDark, ...p } }));
  const setGlass = (p: any) => setTheme(t => ({ ...t, glassConfig: { ...t.glassConfig!, ...p } }));
  const setNeu = (p: any) => setTheme(t => ({ ...t, neumorphConfig: { ...t.neumorphConfig!, ...p } }));
  const setRadius = (p: any) => setTheme(t => ({ ...t, radius: { ...t.radius!, ...p } }));
  const setShadow = (p: any) => setTheme(t => ({ ...t, shadows: { ...t.shadows!, ...p } }));

  const handleStyleChange = (style: 'flat' | 'glass' | 'neumorphism') => {
    if (style === 'glass') {
      setTheme(t => ({
        ...t, style,
        glassConfig: { opacityLight: 68, opacityDark: 38, blur: 24, saturate: 180 },
        shadows: { card: '0 4px 24px rgba(28,25,23,0.06)', float: '0 16px 48px rgba(28,25,23,0.12)' },
        radius: { card: 16, button: 10, input: 12 },
      }));
    } else if (style === 'neumorphism') {
      setTheme(t => ({
        ...t, style,
        neumorphConfig: { intensity: 1, inset: false },
        radius: { card: 16, button: 10, input: 12 },
        shadows: { card: '8px 8px 16px #d1ccc7, -8px -8px 16px #ffffff', float: '12px 12px 24px #d1ccc7, -12px -12px 24px #ffffff' },
      }));
    } else {
      setTheme(t => ({ ...t, style }));
    }
  };

  const previewStyle = useMemo(() => {
    if (theme.style === 'neumorphism') {
      return { background: `hsl(${colors.bg})` } as React.CSSProperties;
    }
    if (bg.type === 'image' && bg.image?.url) {
      return { backgroundImage: `url(${bg.image.url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: `hsl(${colors.bg})` } as React.CSSProperties;
    }
    if (bg.type === 'gradient' && bg.gradient?.from && bg.gradient?.to) {
      return { backgroundImage: `linear-gradient(${bg.gradient.dir || '135deg'}, ${bg.gradient.from}, ${bg.gradient.to})` } as React.CSSProperties;
    }
    if (theme.style === 'glass') {
      return { backgroundImage: lightMode ? `radial-gradient(at 30% 20%, #f5e6d8 0%, #fdf8f4 50%, #ece6e1 100%)` : `radial-gradient(at 30% 20%, #2a1a3a 0%, #1c1917 50%, #0c0a09 100%)` } as React.CSSProperties;
    }
    return { backgroundColor: `hsl(${colors.bg})` } as React.CSSProperties;
  }, [bg, colors.bg, theme.style, lightMode]);

  const glassCardStyle = (isLight: boolean) => {
    if (theme.style !== 'glass') return { backgroundColor: `hsl(${colors.bgCard})`, borderColor: `hsl(${colors.border})`, boxShadow: theme.shadows?.card } as React.CSSProperties;
    const opacity = isLight ? (theme.glassConfig?.opacityLight || 68) / 100 : (theme.glassConfig?.opacityDark || 38) / 100;
    return {
      background: ae(colors.bgCard, opacity),
      border: `1px solid ${ae('#ffffff', isLight ? 0.35 : 0.12)}`,
      borderTop: `1px solid ${ae('#ffffff', isLight ? 0.55 : 0.18)}`,
      boxShadow: `${theme.shadows?.card || '0 4px 24px rgba(28,25,23,0.06)'}, inset 0 1px 0 rgba(255,255,255,0.35)`,
      backdropFilter: `blur(${theme.glassConfig?.blur || 24}px) saturate(${theme.glassConfig?.saturate || 180}%)`,
      WebkitBackdropFilter: `blur(${theme.glassConfig?.blur || 24}px) saturate(${theme.glassConfig?.saturate || 180}%)`,
    } as React.CSSProperties;
  };

  const neuCardStyle = () => {
    if (theme.style !== 'neumorphism') return { backgroundColor: `hsl(${colors.bgCard})`, borderColor: `hsl(${colors.border})` } as React.CSSProperties;
    const intensity = theme.neumorphConfig?.intensity || 1;
    const isLight = lightMode;
    const Ur = isLight ? `rgba(209,197,184,${0.9 * intensity})` : `rgba(10,8,7,${0.9 * intensity})`;
    const Ro = isLight ? `rgba(255,255,255,${0.9 * intensity})` : `rgba(42,37,34,${0.65 * intensity})`;
    const je = 8 * intensity, Vr = 16 * intensity;
    const shadow = theme.neumorphConfig?.inset
      ? `inset ${je}px ${je}px ${Vr}px ${Ur}, inset -${je}px -${je}px ${Vr}px ${Ro}`
      : `${je}px ${je}px ${Vr}px ${Ur}, -${je}px -${je}px ${Vr}px ${Ro}`;
    return { backgroundColor: `hsl(${colors.bgCard})`, border: '1px solid transparent', boxShadow: shadow } as React.CSSProperties;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { setBg({ type: 'image', image: { url: r.result as string } }); toast.success("Imagem carregada"); }; r.readAsDataURL(f);
  };
  const handleRemoveImage = () => {
    setBg({ type: 'solid', image: undefined, gradient: undefined });
    toast.success("Imagem removida - voltou pra sólido");
  };

  // dentro do ThemeEditor, substitui handleSave por:

  const handleSave = async () => {
    const payload = {
      name: theme.name,
      slug: theme.slug,
      style: theme.style,
      colorsLight: theme.colorsLight,
      colorsDark: theme.colorsDark,
      backgroundLight: theme.backgroundLight,
      backgroundDark: theme.backgroundDark,
      glassConfig: theme.glassConfig,
      neumorphConfig: theme.neumorphConfig,
      shadows: theme.shadows,
      radius: theme.radius,
      typography: theme.typography,
      density: theme.density,
      status: theme.status,
    };
    try {
      const isEdit = !!initialTheme?.id && !initialTheme.id.startsWith('theme_');
      if (isEdit) {
        await ThemesAPI.update(initialTheme!.id, payload);
        toast.success("Tema atualizado no banco");
      } else {
        await ThemesAPI.create(payload);
        toast.success("Tema criado no banco");
      }
      router.push("/dashboard/themes");
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e?.body?.message || e.message}`);
    }
  };
  if (!mounted) return <div className="p-6 text-sm text-muted-foreground">Carregando tema...</div>;

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm border rounded-full px-3 py-1.5 hover:bg-muted"><ArrowLeft size={14} /> Voltar</button>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full border ${theme.status === 'published' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>{theme.status}</span>
          <button onClick={handleSave} className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-full text-sm font-medium"><Save size={14} /> Salvar no banco</button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] overflow-hidden">
        <div className="border-r bg-card overflow-auto p-4 space-y-4">
          <div className="bg-background border rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2"><Palette size={14} /> Identidade</h3>
            <input value={theme.name} onChange={e => setTheme({ ...theme, name: e.target.value })} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background" placeholder="Nome" />
            <input value={theme.slug} onChange={e => setTheme({ ...theme, slug: e.target.value })} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background" placeholder="slug" />
            <div className="grid grid-cols-3 gap-2">
              {(['flat', 'glass', 'neumorphism'] as const).map(s => (
                <button key={s} onClick={() => handleStyleChange(s)} className={`text-xs py-2.5 rounded-full border capitalize ${theme.style === s ? 'bg-foreground text-background border-foreground' : 'bg-background border-border'}`}>{s}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={theme.density} onChange={e => setTheme({ ...theme, density: e.target.value as any })} className="border rounded-xl px-3 py-2.5 text-sm bg-background"><option value="comfortable">Confortável</option><option value="compact">Compacto</option></select>
              <select value={theme.status} onChange={e => setTheme({ ...theme, status: e.target.value as any })} className="border rounded-xl px-3 py-2.5 text-sm bg-background"><option value="draft">Draft</option><option value="published">Published</option></select>
            </div>
            {theme.style === 'glass' && <p className="text- text-stone-500">Glass: rgba(card, opacity) + blur + border-top highlight. Fundo usa imagem ou gradiente radial fallback.</p>}
            {theme.style === 'neumorphism' && <p className="text- text-stone-500">Neumorphism: bg e card próximos, sombra dupla calculada por intensity.</p>}
          </div>

          <div className="bg-background border rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center"><h3 className="text-sm font-medium">Cores - {lightMode ? 'Light' : 'Dark'}</h3><button onClick={() => setLightMode(!lightMode)} className="text-xs border rounded-full px-3 py-1">{lightMode ? 'Light → Dark' : 'Dark → Light'}</button></div>
            <ColorField label="bg" value={colors.bg} onChange={v => setColors({ bg: v })} />
            <ColorField label="bgCard" value={colors.bgCard} onChange={v => setColors({ bgCard: v })} />
            <ColorField label="border" value={colors.border} onChange={v => setColors({ border: v })} />
            <ColorField label="text" value={colors.text} onChange={v => setColors({ text: v })} />
            <ColorField label="muted" value={colors.textMuted} onChange={v => setColors({ textMuted: v })} />
            <ColorField label="primary" value={colors.primary} onChange={v => setColors({ primary: v })} />

            <div className="pt-3 border-t space-y-3">
              <p className="text-xs font-medium flex items-center gap-1"><ImageIcon size={12} /> Background {lightMode ? 'Light' : 'Dark'}</p>
              <div className="flex gap-1">
                {(['solid', 'gradient', 'image'] as const).map(t => (
                  <button key={t} onClick={() => setBg({ type: t })} className={`flex-1 text-xs py-1.5 rounded-full border capitalize ${bg.type === t ? 'bg-foreground text-background border-foreground' : 'border-border'}`}>{t}</button>
                ))}
              </div>

              {bg.type === 'gradient' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-8">From</span>
                    <input type="color" value={bg.gradient?.from?.startsWith('#') ? bg.gradient.from : '#f5e6d8'} onChange={e => setBg({ gradient: { ...bg.gradient, from: e.target.value, to: bg.gradient?.to || '#fdf8f4', dir: bg.gradient?.dir || '135deg' } })} className="w-8 h-8 rounded-lg border p-0.5 cursor-pointer shrink-0" />
                    <input value={bg.gradient?.from || ''} onChange={e => setBg({ gradient: { ...bg.gradient, from: e.target.value, to: bg.gradient?.to || '#fdf8f4', dir: bg.gradient?.dir || '135deg' } })} placeholder="#f5e6d8" className="flex-1 border rounded-xl px-2 py-1.5 text-xs font-mono" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-8">To</span>
                    <input type="color" value={bg.gradient?.to?.startsWith('#') ? bg.gradient.to : '#fdf8f4'} onChange={e => setBg({ gradient: { from: bg.gradient?.from || '#f5e6d8', to: e.target.value, dir: bg.gradient?.dir || '135deg' } })} className="w-8 h-8 rounded-lg border p-0.5 cursor-pointer shrink-0" />
                    <input value={bg.gradient?.to || ''} onChange={e => setBg({ gradient: { from: bg.gradient?.from || '#f5e6d8', to: e.target.value, dir: bg.gradient?.dir || '135deg' } })} placeholder="#fdf8f4" className="flex-1 border rounded-xl px-2 py-1.5 text-xs font-mono" />
                  </div>
                  <div className="h-10 rounded-xl border" style={{ backgroundImage: `linear-gradient(${bg.gradient?.dir || '135deg'}, ${bg.gradient?.from || '#f5e6d8'}, ${bg.gradient?.to || '#fdf8f4'})` }} />
                </div>
              )}

              {bg.type === 'image' && (
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 border border-dashed rounded-xl p-2 text-xs cursor-pointer hover:bg-muted">
                    <Upload size={12} /> {bg.image?.url ? 'Trocar imagem' : 'Upload'}<input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  </label>
                  {bg.image?.url && (
                    <div className="space-y-2">
                      <div className="h-20 rounded-xl border bg-cover bg-center" style={{ backgroundImage: `url(${bg.image.url})` }} />
                      <button onClick={handleRemoveImage} className="w-full inline-flex items-center justify-center gap-1.5 text-xs border border-red-200 text-red-600 rounded-full px-3 py-1.5 hover:bg-red-50"><X size={12} /> Remover imagem (volta pra sólido)</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {theme.style === 'glass' && (
              <div className="pt-3 border-t space-y-3 p-3 rounded-xl bg-[#fdf8f4] border border-orange-100">
                <h4 className="text- font-semibold tracking-widest uppercase text-orange-900/70">Glassmorphism • {lightMode ? 'light' : 'dark'}</h4>
                <div className="space-y-2">
                  <label className="text-xs flex justify-between">Opacity <span className="font-mono">{lightMode ? theme.glassConfig?.opacityLight : theme.glassConfig?.opacityDark}%</span></label>
                  <input type="range" min={10} max={90} value={lightMode ? theme.glassConfig?.opacityLight || 68 : theme.glassConfig?.opacityDark || 38} onChange={e => lightMode ? setGlass({ opacityLight: parseInt(e.target.value) }) : setGlass({ opacityDark: parseInt(e.target.value) })} className="w-full accent-[#ea580c]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs flex justify-between">Blur <span className="font-mono">{theme.glassConfig?.blur}px</span></label>
                  <input type="range" min={0} max={40} value={theme.glassConfig?.blur || 24} onChange={e => setGlass({ blur: parseInt(e.target.value) })} className="w-full accent-[#ea580c]" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs flex justify-between">Saturate <span className="font-mono">{theme.glassConfig?.saturate}%</span></label>
                  <input type="range" min={100} max={220} value={theme.glassConfig?.saturate || 180} onChange={e => setGlass({ saturate: parseInt(e.target.value) })} className="w-full accent-[#ea580c]" />
                </div>
                <p className="text- text-stone-600">Cards com rgba(card, opacity) + blur + border-top highlight. Fundo usa imagem ou gradiente radial fallback.</p>
              </div>
            )}

            {theme.style === 'neumorphism' && (
              <div className="pt-3 border-t space-y-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                <h4 className="text- font-semibold tracking-widest uppercase text-stone-600">Neumorphism • {lightMode ? 'light' : 'dark'}</h4>
                <div className="space-y-1">
                  <label className="text-xs flex justify-between">Shadow intensity <span className="font-mono">{(theme.neumorphConfig?.intensity || 1).toFixed(2)}</span></label>
                  <input type="range" min={0.4} max={1.6} step={0.05} value={theme.neumorphConfig?.intensity || 1} onChange={e => setNeu({ intensity: parseFloat(e.target.value) })} className="w-full accent-stone-800" />
                </div>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer"><input type="checkbox" checked={theme.neumorphConfig?.inset || false} onChange={e => setNeu({ inset: e.target.checked })} className="rounded" /> Inset shadow (pressionado)</label>
              </div>
            )}

            <div className="pt-3 border-t space-y-3">
              <h4 className="text- font-semibold tracking-widest uppercase text-stone-500 flex items-center gap-1">Sombras</h4>
              <div className="space-y-1"><div className="text- text-stone-500">shadow-card</div><input value={theme.shadows?.card || ''} onChange={e => setShadow({ card: e.target.value })} className="w-full border rounded-xl px-2 py-1.5 text-xs font-mono bg-background" /></div>
              <div className="space-y-1"><div className="text- text-stone-500">shadow-float</div><input value={theme.shadows?.float || ''} onChange={e => setShadow({ float: e.target.value })} className="w-full border rounded-xl px-2 py-1.5 text-xs font-mono bg-background" /></div>
              <div className="space-y-1"><label className="text-xs">Radius card {theme.radius?.card}px</label><input type="range" min={4} max={32} value={theme.radius?.card || 16} onChange={e => setRadius({ card: parseInt(e.target.value) })} className="w-full" /></div>
              <div className="space-y-1"><label className="text-xs">Radius button {theme.radius?.button}px</label><input type="range" min={4} max={32} value={theme.radius?.button || 10} onChange={e => setRadius({ button: parseInt(e.target.value) })} className="w-full" /></div>
            </div>
          </div>
        </div>

        <div className="overflow-auto bg-muted/20 p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setLightMode(true)} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${lightMode ? 'bg-foreground text-background border-foreground' : 'bg-card border-border'}`}><Monitor size={12} /> Light</button>
            <button onClick={() => setLightMode(false)} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${!lightMode ? 'bg-foreground text-background border-foreground' : 'bg-card border-border'}`}><Monitor size={12} /> Dark</button>
            <span className="text-xs text-muted-foreground self-center ml-2">Preview respeita {lightMode ? 'Light' : 'Dark'} do toggle, não do sistema</span>
          </div>

          <div className="rounded-2xl border min-h- p-4 space-y-4 relative overflow-hidden" style={previewStyle}>
            {theme.style === 'glass' && bg.type === 'image' && bg.image?.url && (
              <div className="absolute inset-0 pointer-events-none" style={{ background: lightMode ? 'rgba(253,248,244,0.55)' : 'rgba(12,10,9,0.55)' }} />
            )}
            <div className="relative space-y-4">
              <div className="border rounded-2xl p-4" style={{ ...(theme.style === 'glass' ? glassCardStyle(lightMode) : theme.style === 'neumorphism' ? neuCardStyle() : { backgroundColor: `hsl(${colors.bgCard})`, borderColor: `hsl(${colors.border})`, boxShadow: theme.shadows?.card }), borderRadius: `${theme.radius?.card || 16}px` }}>
                <p className="text-sm font-semibold" style={{ color: `hsl(${colors.text})` }}>{theme.name} • {theme.style}</p>
                <p className="text-xs" style={{ color: `hsl(${colors.textMuted})` }}>{theme.slug} - radius {theme.radius?.card}px - {lightMode ? 'light' : 'dark'} - {theme.style === 'glass' ? `${theme.glassConfig?.opacityLight || 68}% / blur ${theme.glassConfig?.blur}px` : theme.style === 'neumorphism' ? `intensity ${theme.neumorphConfig?.intensity} ${theme.neumorphConfig?.inset ? 'inset' : ''}` : 'flat'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-2xl p-4" style={{ ...(theme.style === 'glass' ? glassCardStyle(lightMode) : theme.style === 'neumorphism' ? neuCardStyle() : { backgroundColor: `hsl(${colors.bgCard})`, borderColor: `hsl(${colors.border})` }), borderRadius: `${theme.radius?.card || 16}px` }}>
                  <button className="px-4 py-2 text-sm font-medium w-full" style={{ backgroundColor: `hsl(${colors.primary})`, color: `hsl(${colors.primaryForeground || '0 0% 98%'})`, borderRadius: `${theme.radius?.button || 10}px` }}>Primary button</button>
                  <div className="mt-3 flex gap-2"><span className="text-xs px-2 py-1 rounded-full border" style={{ backgroundColor: `hsl(${colors.bgMuted})`, color: `hsl(${colors.textMuted})` }}>Badge</span><span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: `hsl(${colors.primary})`, color: '#fff' }}>Ativo</span></div>
                </div>
                <div className="border rounded-2xl p-4 space-y-2" style={{ ...(theme.style === 'glass' ? glassCardStyle(lightMode) : theme.style === 'neumorphism' ? neuCardStyle() : { backgroundColor: `hsl(${colors.bgCard})`, borderColor: `hsl(${colors.border})` }), borderRadius: `${theme.radius?.card || 16}px` }}>
                  <input placeholder="Input" className="w-full border px-3 py-2 text-sm" style={{ backgroundColor: `hsl(${colors.bg})`, borderColor: `hsl(${colors.border})`, color: `hsl(${colors.text})`, borderRadius: `${theme.radius?.input || 12}px` }} />
                  <input placeholder="Buscar..." className="w-full border px-3 py-2 text-sm" style={{ backgroundColor: `hsl(${colors.bg})`, borderColor: `hsl(${colors.border})`, color: `hsl(${colors.text})`, borderRadius: `${theme.radius?.input || 12}px` }} />
                </div>
              </div>
              <div className="border rounded-2xl p-4" style={{ ...(theme.style === 'glass' ? glassCardStyle(lightMode) : theme.style === 'neumorphism' ? neuCardStyle() : { backgroundColor: `hsl(${colors.bgCard})`, borderColor: `hsl(${colors.border})` }), borderRadius: `${theme.radius?.card || 16}px` }}>
                <p className="text-xs font-medium mb-2" style={{ color: `hsl(${colors.text})` }}>Tabela permissões - teste legibilidade {theme.style}</p>
                <div className="border rounded-xl overflow-hidden" style={{ borderColor: `hsl(${colors.border})` }}>
                  <div className="grid grid-cols-3 text-xs p-2 font-medium" style={{ backgroundColor: `hsl(${colors.bgMuted})`, color: `hsl(${colors.text})` }}><span>Permission</span><span>Domínio</span><span>Status</span></div>
                  {['iam.users.read', 'iam.roles.create', 'platform.tenants.delete'].map(p => (
                    <div key={p} className="grid grid-cols-3 text-xs p-2 border-t" style={{ borderColor: `hsl(${colors.border})`, color: `hsl(${colors.text})` }}><span className="font-mono">{p}</span><span style={{ color: `hsl(${colors.textMuted})` }}>{p.split('.')[0]}</span><span className="text- px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border w-fit">permitido</span></div>
                  ))}
                </div>
              </div>
              <pre className="bg-card border rounded-2xl p-3 text- overflow-auto max-h-" style={{ backgroundColor: `hsl(${colors.bgCard})`, color: `hsl(${colors.text})` }}>{JSON.stringify({ name: theme.name, style: theme.style, density: theme.density, radius: theme.radius, shadows: theme.shadows, light: { colors: { bg: hslStrToHex(colors.bg), bgCard: hslStrToHex(colors.bgCard) }, extras: { bgConfig: bg, glass: theme.glassConfig, neumorph: theme.neumorphConfig } } }, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}