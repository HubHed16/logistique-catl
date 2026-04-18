"use client";

import { Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useGeocode } from "@/lib/simulator/api-hooks";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { components } from "@/lib/apigen/types";

type GeocodeResult = components["schemas"]["GeocodeResult"];

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onPick: (result: GeocodeResult) => void;
  placeholder?: string;
  invalid?: boolean;
  leftIcon?: ReactNode;
};

export function AddressAutocomplete({
  value,
  onChangeText,
  onPick,
  placeholder = "Ex : 12 rue du Marché, Liège",
  invalid,
  leftIcon,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const justPickedRef = useRef(false);

  // Le debounce évite de bombarder Nominatim à chaque frappe.
  const debouncedQuery = useDebouncedValue(value, 300);
  const { data, isFetching } = useGeocode(debouncedQuery);
  const suggestions = data ?? [];
  const showDropdown =
    open && !justPickedRef.current && debouncedQuery.trim().length >= 3;

  // Ferme au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Reset le flag "on vient de cliquer" quand la valeur repart en saisie.
  useEffect(() => {
    if (!justPickedRef.current) return;
    // Un tick pour laisser le state "value" se mettre à jour.
    const id = window.setTimeout(() => {
      justPickedRef.current = false;
    }, 0);
    return () => window.clearTimeout(id);
  }, [value]);

  const pick = (s: GeocodeResult) => {
    justPickedRef.current = true;
    setOpen(false);
    setActiveIndex(-1);
    onPick(s);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChangeText(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          className={`w-full rounded-md border-2 text-sm px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-catl-accent/20 ${
            leftIcon ? "pl-9" : ""
          } ${
            invalid
              ? "border-catl-danger bg-red-50"
              : "border-gray-200 focus:border-catl-accent"
          }`}
        />
        {isFetching && value.trim().length >= 3 && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catl-accent animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-xl border border-catl-primary/10 z-40 max-h-64 overflow-y-auto">
          {isFetching && suggestions.length === 0 && (
            <div className="p-3 text-sm text-catl-text">Recherche…</div>
          )}
          {!isFetching && suggestions.length === 0 && (
            <div className="p-3 text-sm text-catl-text italic">
              Aucune suggestion pour « {debouncedQuery} ».
            </div>
          )}
          {suggestions.length > 0 && (
            <ul role="listbox">
              {suggestions.map((s, i) => {
                const isActive = i === activeIndex;
                return (
                  <li
                    key={`${s.latitude}-${s.longitude}-${i}`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(s)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-catl-accent/10 text-catl-primary"
                          : "hover:bg-catl-bg text-catl-primary"
                      }`}
                    >
                      <div className="truncate">{s.displayName}</div>
                      <div className="text-xs text-catl-text">
                        {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                      </div>
                    </button>
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
