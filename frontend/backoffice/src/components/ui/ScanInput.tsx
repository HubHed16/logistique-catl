"use client";

import { Barcode } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

type ScanInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "autoComplete"
> & {
  invalid?: boolean;
  onScan?: (value: string) => void;
};

/**
 * Input optimisé pour les scanners code-barres (émulation clavier + Enter).
 * L'`onScan` est déclenché à la touche Enter, avec la valeur courante.
 * Les scanners émettent en général les 13 digits EAN suivis d'un Enter.
 */
export const ScanInput = forwardRef<HTMLInputElement, ScanInputProps>(
  function ScanInput({ invalid, onScan, onKeyDown, className, ...props }, ref) {
    return (
      <div className="relative">
        <Barcode
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-catl-accent pointer-events-none"
          aria-hidden
        />
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`block w-full pl-10 pr-3 py-3 text-base rounded-md border bg-white placeholder:text-catl-text/40 focus:outline-none focus:ring-2 transition-colors font-mono tabular-nums ${
            invalid
              ? "border-catl-danger bg-red-50 focus:ring-catl-danger/40"
              : "border-gray-200 focus:border-catl-primary focus:ring-catl-primary/30"
          } ${className ?? ""}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onScan) {
              e.preventDefault();
              onScan((e.target as HTMLInputElement).value.trim());
            }
            onKeyDown?.(e);
          }}
          {...props}
        />
      </div>
    );
  },
);
