"use client";
import { useThemeStore } from "@/stores/useThemeStore";

function hslToRgb(hsl: string){
  const m = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if(!m) return {r:255,g:255,b:255};
  const h = Number(m[1]), s = Number(m[2])/100, l = Number(m[3])/100;
  const c = (1-Math.abs(2*l-1))*s;
  const x = c*(1-Math.abs((h/60)%2-1));
  const mm = l-c/2;
  let r=0,g=0,b=0;
  if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){r=0;g=c;b=x}else if(h<240){r=0;g=x;b=c}else if(h<300){r=x;g=0;b=c}else{r=c;g=0;b=x}
  return {r:Math.round((r+mm)*255), g:Math.round((g+mm)*255), b:Math.round((b+mm)*255)};
}

export function ThemeGlobalStyles(){
  const active = useThemeStore(s=> s.themes.find(t=>t.id===s.activeThemeId) || s.themes[0]);
  if(!active) return null;
  const opacityLight = (active.glassConfig?.opacityLight||68)/100;
  const opacityDark = (active.glassConfig?.opacityDark||38)/100;
  const blur = active.glassConfig?.blur||24;
  const saturate = active.glassConfig?.saturate||180;
  const intensity = active.neumorphConfig?.intensity||1;
  const inset = active.neumorphConfig?.inset;
  const cardLight = hslToRgb(active.colorsLight.bgCard);
  const cardDark = hslToRgb(active.colorsDark.bgCard);
  const je = 8*intensity, Vr = 16*intensity;

  return <style dangerouslySetInnerHTML={{__html:`
    /* GLASS só onde tem data-glass-card */
    [data-theme-style="glass"] [data-glass-card]{
      background: rgba(${cardLight.r},${cardLight.g},${cardLight.b},${opacityLight})!important;
      border: 1px solid rgba(255,255,255,0.35)!important;
      border-top: 1px solid rgba(255,255,255,0.55)!important;
      box-shadow: ${active.shadows?.card||'0 4px 24px rgba(28,25,23,0.06)'}, inset 0 1px 0 rgba(255,255,255,0.35)!important;
      backdrop-filter: blur(${blur}px) saturate(${saturate}%)!important;
      -webkit-backdrop-filter: blur(${blur}px) saturate(${saturate}%)!important;
    }
   .dark [data-theme-style="glass"] [data-glass-card]{
      background: rgba(${cardDark.r},${cardDark.g},${cardDark.b},${opacityDark})!important;
      border: 1px solid rgba(255,255,255,0.12)!important;
      border-top: 1px solid rgba(255,255,255,0.18)!important;
    }
    /* deixa o conteúdo transparente pra imagem aparecer, mas sidebar continua sólida */
    [data-theme-style="glass"] main > div{ background: transparent!important; }

    /* NEUMORPHISM */
    [data-theme-style="neumorphism"]{ --neu-l:${je}px ${je}px ${Vr}px rgba(209,197,184,${0.9*intensity}), -${je}px -${je}px ${Vr}px rgba(255,255,255,${0.9*intensity}); --neu-d:${je}px ${je}px ${Vr}px rgba(10,8,7,${0.9*intensity}), -${je}px -${je}px ${Vr}px rgba(42,37,34,${0.65*intensity}); --neu-il:inset ${je}px ${je}px ${Vr}px rgba(209,197,184,${0.9*intensity}), inset -${je}px -${je}px ${Vr}px rgba(255,255,255,${0.9*intensity}); --neu-id:inset ${je}px ${je}px ${Vr}px rgba(10,8,7,${0.9*intensity}), inset -${je}px -${je}px ${Vr}px rgba(42,37,34,${0.65*intensity}); }
    [data-theme-style="neumorphism"] [data-glass-card]{ background: hsl(var(--bg-card))!important; border: 1px solid transparent!important; box-shadow: ${inset?'var(--neu-il)':'var(--neu-l)'}!important; }
   .dark [data-theme-style="neumorphism"] [data-glass-card]{ box-shadow: ${inset?'var(--neu-id)':'var(--neu-d)'}!important; }
  `}} />;
}