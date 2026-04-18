import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  validated?: boolean;
  children: ReactNode;
};

export function Card({ validated, className, children, ...props }: CardProps) {
  return (
    <div
      className={`catl-card ${validated ? "catl-card--validated" : ""} ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 className="text-lg font-bold text-catl-primary">{children}</h2>
      {action}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="catl-section-title">{children}</h3>;
}
