"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Seriler" },
  { href: "/marathon", label: "Maraton" },
  { href: "/leaderboard", label: "Tablo" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-subtle bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex flex-col leading-none">
          <span className="text-xs uppercase tracking-[0.35em] text-foreground/50">
            Artı Series
          </span>
          <span className="text-lg font-semibold tracking-tight transition group-hover:text-accent">
            4 — Mini Kolleksiyon
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`font-medium transition hover:text-accent ${
                  active ? "text-foreground" : "text-foreground/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
