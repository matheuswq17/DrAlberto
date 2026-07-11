"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  CalendarIcon,
  LayoutGridIcon,
  PuzzleIcon,
  RepeatIcon,
  SettingsIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Visão geral", icon: LayoutGridIcon },
  { href: "/agenda", label: "Agenda", icon: CalendarIcon },
  { href: "/urgencias", label: "Urgências", icon: TriangleAlertIcon },
  { href: "/encaixes", label: "Encaixes", icon: PuzzleIcon },
  { href: "/retornos", label: "Retornos", icon: RepeatIcon },
  { href: "/funil", label: "Funil", icon: BarChart3Icon },
  { href: "/config", label: "Configurações", icon: SettingsIcon },
];

/**
 * Lista de navegação vertical reutilizada pela sidebar fixa (desktop/tablet)
 * e pelo drawer mobile. `compact` esconde o rótulo e centra o ícone (rail do
 * tablet); `onNavigate` fecha o drawer mobile ao trocar de rota.
 */
export function SidebarNav({
  urgencyCount = 0,
  compact = false,
  onNavigate,
}: {
  urgencyCount?: number;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // Pulso finito (não infinito) só quando a contagem SOBE — chama atenção
  // para uma urgência nova sem virar sirene constante.
  const prevCount = useRef(urgencyCount);
  const [justIncreased, setJustIncreased] = useState(false);
  useEffect(() => {
    if (urgencyCount > prevCount.current) {
      setJustIncreased(true);
      const t = setTimeout(() => setJustIncreased(false), 1200);
      prevCount.current = urgencyCount;
      return () => clearTimeout(t);
    }
    prevCount.current = urgencyCount;
  }, [urgencyCount]);

  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            title={compact ? item.label : undefined}
            className={cn(
              "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
              compact && "justify-center px-2",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden="true" />
            <span className={cn(compact && "sr-only")}>{item.label}</span>
            {item.href === "/urgencias" && urgencyCount > 0 && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-urgent px-1 text-[11px] font-semibold text-white",
                  compact ? "absolute top-1 right-1 h-4 min-w-4 text-[10px]" : "ml-auto",
                  justIncreased &&
                    "motion-reduce:animate-none animate-[badge-pulse_0.6s_ease-in-out_2]"
                )}
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
