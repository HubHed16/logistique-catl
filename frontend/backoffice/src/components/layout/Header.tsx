import Link from "next/link";

export function Header() {
  return (
    <header className="bg-white border-t-[6px] border-catl-success shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-catl-primary font-bold text-xl tracking-tight">
            CATL
          </span>
          <span className="text-catl-text text-sm">· Back-office</span>
        </Link>
        <div className="text-xs text-catl-text text-right leading-tight border-l border-gray-200 pl-5">
          <div className="font-bold uppercase text-catl-accent tracking-wider">
            Assistance
          </div>
          <a
            href="mailto:christian.jonet@catl.be"
            className="text-catl-primary hover:text-catl-accent transition-colors"
          >
            christian.jonet@catl.be
          </a>
        </div>
      </div>
    </header>
  );
}
