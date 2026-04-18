import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-catl-text mb-1.5 uppercase tracking-wide">
        {label}
        {required && <span className="text-catl-danger ml-1">*</span>}
      </span>
      {children}
      {error ? (
        <span className="block text-xs text-catl-danger mt-1.5">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-catl-text/70 mt-1.5">{hint}</span>
      ) : null}
    </label>
  );
}

const inputBase =
  "block w-full px-3 py-2 text-sm rounded-md border bg-white placeholder:text-catl-text/40 focus:outline-none focus:ring-2 transition-colors";

function inputClasses(error?: boolean): string {
  return `${inputBase} ${
    error
      ? "border-catl-danger bg-red-50 focus:ring-catl-danger/40"
      : "border-gray-200 focus:border-catl-primary focus:ring-catl-primary/30"
  }`;
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, TextInputProps>(
  function Input({ invalid, className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`${inputClasses(invalid)} ${className ?? ""}`}
        {...props}
      />
    );
  },
);

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ invalid, className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={`${inputClasses(invalid)} ${className ?? ""}`}
        {...props}
      >
        {children}
      </select>
    );
  },
);

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid, className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={`${inputClasses(invalid)} resize-y min-h-[80px] ${className ?? ""}`}
        {...props}
      />
    );
  },
);
