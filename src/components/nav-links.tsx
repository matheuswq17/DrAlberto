"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Agenda" },
  { href: "/urgencias", label: "Urgências" },
  { href: "/encaixes", label: "Encaixes" },
  { href: "/retornos", label: "Retornos" },
  { href: "/funil", label: "Funil" },
  { href: "/config", label: "Config" },
];

export function NavLinks({ urgencyCount = 0 }: { urgencyCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
            {item.href === "/urgencias" && urgencyCount > 0 && (
              <span
                className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-status-urgent px-1 text-[10px] font-semibold text-white"
                aria-label={`${urgencyCount} urgência${urgencyCount > 1 ? "s" : ""} sem revisão`}
              >
                {urgencyCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
