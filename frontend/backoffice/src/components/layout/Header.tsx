import Link from "next/link";
import { Mail } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white border-t-[6px] border-catl-success shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-baseline gap-2 min-w-0">
          <span className="text-catl-primary font-bold text-lg sm:text-xl tracking-tight">
            CATL
          </span>
          <span className="text-catl-text text-xs sm:text-sm truncate">
            · Back-office
          </span>
        </Link>
        <a
          href="mailto:christian.jonet@catl.be"
          className="shrink-0 flex items-center gap-2 text-catl-primary hover:text-catl-accent transition-colors border-l border-gray-200 pl-3 sm:pl-5"
          aria-label="Contacter l'assistance CATL"
        >
          <Mail className="w-4 h-4 text-catl-accent" />
          <span className="hidden sm:flex flex-col text-xs text-catl-text text-right leading-tight">
            <span className="font-bold uppercase text-catl-accent tracking-wider">
              Assistance
            </span>
            <span className="text-catl-primary">christian.jonet@catl.be</span>
          </span>
        </a>
      </div>
    </header>
  );
}
