import Link from "next/link";
import { CheckIcon } from "lucide-react";
import type { SourceWarning } from "@/lib/today";

// Avisos de fonte de dados (âmbar = atenção): distinguem "falta configurar"
// de "leitura falhou". Âmbar aqui é uso semântico legítimo (atenção), não
// mensagem genérica de sistema.

export function SourceWarnings({ warnings }: { warnings: SourceWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="grid gap-2">
      {warnings.map((w) => (
        <p
          key={w.text}
          className="rounded-md border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-xs text-status-warning-foreground"
        >
          <span className="font-medium">
            {w.kind === "config"
              ? "Falta configurar: "
              : w.kind === "dados"
                ? "Dado suspeito: "
                : "Falha de leitura: "}
          </span>
          {w.text}
          {w.href && (
            <>
              {" "}
              <Link
                href={w.href}
                className="font-medium text-primary underline"
              >
                Abrir configurações →
              </Link>
            </>
          )}
        </p>
      ))}
    </div>
  );
}

/** Confirmação de que a leitura desta página funcionou agora. */
export function ReadOkStamp({
  readAt,
  label,
}: {
  readAt: string;
  label: string;
}) {
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(readAt));
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckIcon className="size-3.5 shrink-0 text-status-ok" aria-hidden="true" />
      {label} às {time}.
    </p>
  );
}
