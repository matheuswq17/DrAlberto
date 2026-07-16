"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { maskPhone } from "@/lib/phone";

/**
 * Telefone mascarado por padrão ("(62) 9••••-1111"), com botão de revelação
 * acessível para quando houver necessidade operacional de ver o número
 * completo (ex.: confirmar antes de ligar).
 */
export function PhoneReveal({
  phone,
  className,
}: {
  phone: string | null | undefined;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const id = useId();
  const hasPhone = !!(phone ?? "").trim();
  const masked = maskPhone(phone);
  const full = (phone ?? "").trim() || "—";

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <span id={id} className="tabular-nums">
        {revealed ? full : masked}
      </span>
      {hasPhone && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRevealed((r) => !r);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={
            revealed
              ? "Ocultar telefone completo"
              : "Mostrar telefone completo"
          }
          aria-describedby={id}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {revealed ? (
            <EyeOffIcon className="size-3.5" aria-hidden="true" />
          ) : (
            <EyeIcon className="size-3.5" aria-hidden="true" />
          )}
        </button>
      )}
    </span>
  );
}
