"use client";

// Lista à esquerda da aba Conversas — pacientes com procedimento ou consulta
// marcados, mais recentes primeiro. Unifica as duas origens (procedure_bookings
// e consultation_bookings); não é caixa de entrada geral do bot.

import { PhoneReveal } from "@/components/phone-reveal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import type { ConversationBooking } from "@/lib/conversations";
import { InboxIcon } from "lucide-react";

export function ConversationList({
  bookings,
  selectedId,
  onSelect,
}: {
  bookings: ConversationBooking[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon={InboxIcon}>Nenhuma conversa ainda.</EmptyState>
      </div>
    );
  }

  return (
    <div className="grid gap-1 p-2">
      {bookings.map((b) => (
        <div
          key={b.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(b.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(b.id);
            }
          }}
          className={cn(
            "grid cursor-pointer gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-accent",
            selectedId === b.id && "border-primary bg-accent"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{b.patientName}</span>
            <StatusBadge semantic={b.paymentStatus === "pendente" ? "warning" : "ok"}>
              {b.paymentStatus === "pendente" ? "pendente" : "confirmado"}
            </StatusBadge>
          </div>
          <p className="truncate text-xs text-muted-foreground">{b.serviceLabel}</p>
          <div className="flex items-center justify-between gap-2">
            <PhoneReveal phone={b.patientPhone} className="text-xs" />
            {b.botPaused && (
              <StatusBadge semantic="warning" className="text-[10px]">
                bot pausado
              </StatusBadge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
