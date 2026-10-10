"use client";

import { usePermissions } from "@/lib/permission-context";
import { Button } from "@/components/ui/button";

export function CanButton({
  permission,
  children,
  ...props
}: any) {
  const { hasPermission } = usePermissions();
  const allowed = hasPermission(permission);

  return (
    <Button
      {...props}
      disabled={!allowed || props.disabled}
      title={!allowed ? `Sem permissão: ${permission}` : props.title}
      className={`${!allowed ? "opacity-50 cursor-not-allowed" : ""} ${props.className || ""}`}
    >
      {children} {!allowed && <span className="ml-1.5 text-xs">🔒</span>}
    </Button>
  );
}

export function CanGhostButton({
  permission,
  children,
  ...props
}: any) {
  const { hasPermission } = usePermissions();
  const allowed = hasPermission(permission);

  return (
    <button
      {...props}
      disabled={!allowed || props.disabled}
      title={!allowed ? `Sem permissão: ${permission}` : props.title}
      className={`text-sm px-2.5 py-1 rounded-full border transition ${
        !allowed
          ? "opacity-40 cursor-not-allowed pointer-events-none border-border text-muted-foreground"
          : "border-border hover:bg-muted text-foreground"
      } ${props.className || ""}`}
    >
      {children} {!allowed && " 🔒"}
    </button>
  );
}