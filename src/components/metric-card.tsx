import Link from "next/link";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Card de métrica curta (ícone + rótulo + número + legenda) usado na Visão
 * geral. Quando `href` é passado, o card inteiro é um link para o contexto
 * correspondente (ex.: consultas de hoje → Agenda do dia).
 */
export function MetricCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = "default",
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  tone?: "default" | "urgent";
  href?: string;
}) {
  const card = (
    <Card
      size="sm"
      className={cn(
        href &&
          "transition-colors hover:border-primary/40 focus-visible:border-primary/40"
      )}
    >
      <CardContent className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            tone === "urgent"
              ? "bg-status-urgent/10 text-status-urgent"
              : "bg-secondary text-primary"
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {caption && (
            <p
              className={cn(
                "truncate text-xs",
                tone === "urgent"
                  ? "font-medium text-status-urgent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {caption}
            </p>
          )}
        </div>
        {href && (
          <ChevronRightIcon
            className="mt-1 size-4 shrink-0 self-start text-muted-foreground/60"
            aria-hidden="true"
          />
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {card}
    </Link>
  );
}
