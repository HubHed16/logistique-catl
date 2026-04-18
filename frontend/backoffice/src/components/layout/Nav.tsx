"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  History,
  Home,
  Inbox,
  Layers,
  Route,
} from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  external?: boolean;
};

const items: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/reception", label: "Réception", icon: Inbox },
  { href: "/zones", label: "Zones", icon: Layers },
  { href: "/history", label: "Historique", icon: History },
  { href: "/simulator", label: "Simulateur", icon: Route },
  {
    href: "/simulator/index.html",
    label: "Simulateur (legacy)",
    icon: Route,
    external: true,
  },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <ul className="max-w-6xl mx-auto px-6 flex gap-1">
        {items.map(({ href, label, icon: Icon, external }) => {
          const active =
            !external &&
            (href === "/" ? pathname === "/" : pathname.startsWith(href));
          const className = `flex items-center gap-2 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 ${
            active
              ? "border-catl-accent text-catl-accent"
              : "border-transparent text-catl-text hover:text-catl-primary"
          }`;
          return (
            <li key={href}>
              {external ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              ) : (
                <Link href={href} className={className}>
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
