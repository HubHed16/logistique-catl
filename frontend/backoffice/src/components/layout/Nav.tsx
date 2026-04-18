"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, Layers, History } from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const items: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/reception", label: "Réception", icon: Inbox },
  { href: "/zones", label: "Zones", icon: Layers },
  { href: "/history", label: "Historique", icon: History },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <ul className="max-w-6xl mx-auto px-6 flex gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 ${
                  active
                    ? "border-catl-accent text-catl-accent"
                    : "border-transparent text-catl-text hover:text-catl-primary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
