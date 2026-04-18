import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-catl-accent text-white hover:opacity-90 shadow-[0_4px_10px_rgba(230,126,34,0.2)] focus-visible:ring-catl-accent",
  secondary:
    "bg-white text-catl-primary border border-catl-primary/20 hover:bg-catl-bg focus-visible:ring-catl-primary",
  danger:
    "bg-catl-danger text-white hover:opacity-90 shadow-[0_4px_10px_rgba(231,76,60,0.2)] focus-visible:ring-catl-danger",
  ghost:
    "bg-transparent text-catl-text hover:bg-catl-bg focus-visible:ring-catl-primary",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md",
  md: "px-5 py-2.5 text-sm rounded-md",
  lg: "px-8 py-3 text-base rounded-full",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
        className ?? ""
      }`}
      {...props}
    >
      {loading && (
        <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {!loading && leftIcon}
      {children}
    </button>
  );
}
