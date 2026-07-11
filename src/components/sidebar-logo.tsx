import Link from "next/link";
import { HeartPulseIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 px-1 text-foreground",
        compact && "justify-center px-0"
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartPulseIcon className="size-5" aria-hidden="true" />
      </span>
      {compact ? (
        <span className="sr-only">Painel do Dr. Alberto Rassi — início</span>
      ) : (
        <span className="text-base font-semibold leading-tight text-foreground">
          Dr. Alberto Rassi
        </span>
      )}
    </Link>
  );
}
