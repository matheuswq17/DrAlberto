import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Perfil autenticado + logout, no rodapé da sidebar. */
export function SidebarProfile({
  name,
  roleLabel,
  logoutAction,
  compact = false,
}: {
  name: string;
  roleLabel: string | null;
  logoutAction: () => Promise<void>;
  compact?: boolean;
}) {
  return (
    <div className="border-t border-sidebar-border pt-3">
      <div
        className={
          compact
            ? "flex flex-col items-center gap-1"
            : "flex items-center gap-2.5 px-1"
        }
      >
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
          aria-hidden="true"
        >
          {initialsOf(name)}
        </div>
        {!compact && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {roleLabel && (
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            )}
          </div>
        )}
      </div>
      <form action={logoutAction}>
        <Button
          variant="ghost"
          size="sm"
          type="submit"
          title={compact ? "Sair" : undefined}
          className={
            compact
              ? "mt-2 w-full justify-center text-muted-foreground"
              : "mt-1 w-full justify-start gap-2 text-muted-foreground"
          }
        >
          <LogOutIcon className="size-4" aria-hidden="true" />
          <span className={compact ? "sr-only" : undefined}>Sair</span>
        </Button>
      </form>
    </div>
  );
}
