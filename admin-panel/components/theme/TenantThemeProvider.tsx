"use client"

import * as React from "react"
import { useTheme as useNextTheme } from "next-themes"
import { useAuthStore } from "@/stores/useAuthStore"
import { useThemeStore } from "@/stores/useThemeStore"

const AUTH_URL =
  process.env.NEXT_PUBLIC_AUTH_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000"

/**
 * Aplica o tema do tenant no documento.
 */
function applyThemeToDocument(theme: any, mode: "light" | "dark") {
  if (!theme) return
  const colors = mode === "dark" ? theme.colorsDark : theme.colorsLight
  const bg = mode === "dark" ? theme.backgroundDark : theme.backgroundLight
  if (!colors) return

  const root = document.documentElement

  root.style.setProperty("--bg", colors.bg)
  root.style.setProperty("--bg-card", colors.bgCard)
  root.style.setProperty("--bg-muted", colors.bgMuted)
  root.style.setProperty("--border", colors.border)
  root.style.setProperty("--text", colors.text)
  root.style.setProperty("--text-muted", colors.textMuted)
  root.style.setProperty("--primary", colors.primary)
  root.style.setProperty("--primary-foreground", colors.primaryForeground)

  root.style.setProperty("--radius-card", `${theme.radius?.card ?? 16}px`)
  root.style.setProperty("--radius-button", `${theme.radius?.button ?? 12}px`)
  root.style.setProperty("--radius-input", `${theme.radius?.input ?? 12}px`)

  if (bg?.type === "gradient" && bg.gradient?.from) {
    root.style.setProperty(
      "--bg-image",
      `linear-gradient(${bg.gradient.dir || "135deg"}, ${bg.gradient.from}, ${bg.gradient.to})`,
    )
  } else if (bg?.type === "image" && bg.image?.url) {
    root.style.setProperty("--bg-image", `url(${bg.image.url})`)
  } else {
    root.style.setProperty("--bg-image", "none")
  }

  if (theme.style === "glass") {
    root.classList.add("glass")
    const opacityLight = (theme.glassConfig?.opacityLight ?? 68) / 100
    const opacityDark = (theme.glassConfig?.opacityDark ?? 12) / 100
    const opacity = mode === "dark" ? opacityDark : opacityLight
    root.style.setProperty("--glass-opacity", `${opacity}`)
    root.style.setProperty("--glass-blur", `${theme.glassConfig?.blur ?? 24}px`)
    root.style.setProperty(
      "--glass-saturate",
      `${theme.glassConfig?.saturate ?? 180}%`,
    )
  } else {
    root.classList.remove("glass")
  }

  if (theme.style === "neumorphism") {
    root.classList.add("neumorph")
    if (theme.neumorphConfig?.inset) {
      root.classList.add("neumorph-inset")
    } else {
      root.classList.remove("neumorph-inset")
    }
    const intensity = theme.neumorphConfig?.intensity ?? 1
    root.style.setProperty("--neumorph-intensity", `${intensity * 6}px`)
    root.style.setProperty("--neumorph-blur", `${intensity * 12}px`)
  } else {
    root.classList.remove("neumorph", "neumorph-inset")
  }

  root.setAttribute("data-theme-style", theme.style ?? "flat")
}

export function TenantThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const selectedTenantId = useAuthStore((s) => s.selectedTenantId)
  const user = useAuthStore((s) => s.user)
  const { themes, activeThemeId, hydrateFromBackend } = useThemeStore()

  // next-themes e a UNICA fonte de verdade pra light/dark/system.
  // `resolvedTheme` ja entrega 'light' ou 'dark' resolvido.
  const { resolvedTheme } = useNextTheme()

  const [resolvedMode, setResolvedMode] = React.useState<"light" | "dark">(
    "light",
  )
  const fetchedRef = React.useRef<string | null>(null)

  const effectiveTenantId =
    selectedTenantId ||
    (user as any)?.tenantId ||
    (user as any)?.tenant?.id ||
    null

  // Resolve light/dark. next-themes ja cuida de 'system'.
  React.useEffect(() => {
    if (resolvedTheme === "dark" || resolvedTheme === "light") {
      setResolvedMode(resolvedTheme)
    }
  }, [resolvedTheme])

  // Aplica o tema ativo
  React.useEffect(() => {
    const theme = themes.find((t) => t.id === activeThemeId) || themes[0]
    if (theme) applyThemeToDocument(theme, resolvedMode)
  }, [themes, activeThemeId, resolvedMode])

  // Busca o tema do tenant no backend
  React.useEffect(() => {
    if (!effectiveTenantId) return
    if (fetchedRef.current === effectiveTenantId) return
    fetchedRef.current = effectiveTenantId

    fetch(`${AUTH_URL}/tenants/${effectiveTenantId}/theme`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((backendTheme) => {
        hydrateFromBackend(backendTheme || null)
      })
      .catch(() => hydrateFromBackend(null))
  }, [effectiveTenantId, hydrateFromBackend])

  return <>{children}</>
}