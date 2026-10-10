"use client";

type Props = {
  selectedCount: number;
  groupsCount: number;
  saving: boolean;
  isDirty: boolean;
  onReset: () => void;
  onSave: () => void;
};

export function PermissionFooter({
  selectedCount,
  groupsCount,
  saving,
  isDirty,
  onReset,
  onSave,
}: Props) {
  return (
    <div className="shrink-0 border-t border-border bg-card p-3 flex items-center justify-between rounded-b-2xl">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">
          {selectedCount} permissões selecionadas
        </span>{" "}
        • {groupsCount} grupos
        {isDirty && (
          <span className="ml-2 text-amber-600">• alterações não salvas</span>
        )}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onReset}
          disabled={saving || !isDirty}
          className="px-4 py-2 border border-border rounded-full text-sm font-medium hover:bg-muted transition disabled:opacity-50"
        >
          Resetar
        </button>
        <button
          onClick={onSave}
          disabled={saving || !isDirty}
          className="px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? "Salvando..." : "✓ Salvar permissões"}
        </button>
      </div>
    </div>
  );
}