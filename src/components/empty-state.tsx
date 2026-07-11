import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Estado vazio com ícone — para não parecer tela quebrada quando não há dados. */
export function EmptyState({
  icon: Icon = InboxIcon,
  className,
  children,
}: {
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex items-center justify-center gap-2 text-sm text-muted-foreground",
        className
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
      {children}
    </p>
  );
}
