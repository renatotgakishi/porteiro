"use client";
import { HTMLAttributes } from "react"
import { useThemeStore } from "@/stores/useThemeStore"
import { useTheme } from "next-themes"

export function Card({ className = "", style, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { resolvedTheme } = useTheme();
  const active = useThemeStore(s => s.themes.find(t=>t.id===s.activeThemeId) || s.themes[0]);
  const isDark = resolvedTheme === 'dark';
  const isGlass = active?.style === 'glass';
  const isNeu = active?.style === 'neumorphism';

  const glass = active?.glassConfig;
  const blur = glass?.blur ?? 24;
  const sat = glass?.saturate ?? 180;
  const oL = (glass?.opacityLight ?? 68) / 100;
  const oD = (glass?.opacityDark ?? 38) / 100;

  const neu = active?.neumorphConfig;
  const intensity = neu?.intensity ?? 1;
  const inset = neu?.inset;
  const j = 8 * intensity;
  const V = 16 * intensity;

  const glassStyle: React.CSSProperties | undefined = isGlass ? {
    background: isDark ? `rgba(22,20,19,${oD})` : `rgba(255,255,255,${oL})`,
    backdropFilter: `blur(${blur}px) saturate(${sat}%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(${sat}%)`,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.35)',
    boxShadow: isDark 
      ? '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
      : '0 8px 32px rgba(28,25,23,0.08), inset 0 1px 0 rgba(255,255,255,0.5)',
    ...style
  } : undefined;

  const neuShadow = isNeu ? (inset
    ? `inset ${j}px ${j}px ${V}px rgba(209,197,184,${0.9*intensity}), inset -${j}px -${j}px ${V}px rgba(255,255,255,${0.9*intensity})`
    : `${j}px ${j}px ${V}px rgba(209,197,184,${0.9*intensity}), -${j}px -${j}px ${V}px rgba(255,255,255,${0.9*intensity})`
  ) : undefined;

  const neuShadowDark = isNeu ? (inset
    ? `inset ${j}px ${j}px ${V}px rgba(10,8,7,${0.9*intensity}), inset -${j}px -${j}px ${V}px rgba(42,37,34,0.65)`
    : `${j}px ${j}px ${V}px rgba(10,8,7,${0.9*intensity}), -${j}px -${j}px ${V}px rgba(42,37,34,0.65)`
  ) : undefined;

  const neuStyle: React.CSSProperties | undefined = isNeu ? {
    boxShadow: isDark ? neuShadowDark : neuShadow,
    borderColor: 'transparent',
    ...style
  } : undefined;

  return (
    <div
      className={`
        border rounded-2xl
        ${isGlass ? 'border-white/30' : 'border-border'}
        ${isGlass || isNeu ? '' : 'bg-card shadow-sm'}
        ${isNeu ? 'bg-card' : ''}
        ${className}
      `}
      style={isGlass ? glassStyle : isNeu ? neuStyle : style}
      {...props}
    />
  )
}