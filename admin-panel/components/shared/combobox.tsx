"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

export type ComboboxOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  /**
   * Se passado, delega o filtro pro pai (server-side search).
   * O pai deve atualizar `options` conforme o `query` muda.
   * Se não passado, filtra no cliente.
   */
  onSearchChange?: (query: string) => void;
};

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  emptyMessage = "Nenhum resultado",
  disabled = false,
  loading = false,
  onSearchChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    if (onSearchChange) return options; // server-side: o pai já filtrou
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, onSearchChange]);

  // Reseta o highlight quando a lista filtrada muda
  useEffect(() => {
    setHighlighted(0);
  }, [filtered.length, query]);

  // Notifica o pai quando o query muda (server-side)
  useEffect(() => {
    if (onSearchChange && open) {
      onSearchChange(query);
    }
  }, [query, onSearchChange, open]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Scroll do item destacado pra dentro da view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlighted] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setHighlighted(0);
    // Foca o input no próximo tick (o input só existe quando open)
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeDropdown() {
    setOpen(false);
    setQuery("");
  }

  function selectOption(opt: ComboboxOption) {
    onChange(opt.value);
    closeDropdown();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlighted];
      if (opt) selectOption(opt);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
    } else if (e.key === "Tab") {
      closeDropdown();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger / Input */}
      {open ? (
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite para filtrar..."
          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={openDropdown}
          onKeyDown={handleKeyDown}
          className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-left flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/40 transition"
        >
          <span
            className={`truncate ${
              selected ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {selected ? selected.label : placeholder}
          </span>
          {loading ? (
            <Loader2 size={14} className="animate-spin shrink-0" />
          ) : (
            <ChevronDown size={14} className="shrink-0 opacity-60" />
          )}
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <ul
              ref={listRef}
              className="max-h-60 overflow-y-auto py-1"
              role="listbox"
            >
              {filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isHighlighted = i === highlighted;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlighted(i)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // evita blur do input
                      selectOption(opt);
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${
                      isHighlighted ? "bg-muted" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate">{opt.label}</p>
                      {opt.hint && (
                        <p className="text-xs text-muted-foreground truncate">
                          {opt.hint}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} className="shrink-0 text-primary" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}