"use client";

// Modal de detalhe de uma consulta na Agenda (Semana e Mês) — mesma ficha
// estruturada da visão Dia (LeadFacts), dentro de um Dialog.

import type { AgendaEntry } from "@/lib/agenda";
import { UNIT_COLOR, UNIT_LABELS, NO_UNIT_COLOR } from "@/lib/units";
import { LeadFacts } from "@/components/patient-info";
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function entryDayLabel(dayKey: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${dayKey}T12:00:00`));
  // só a primeira letra — text-transform: capitalize maiusculiza toda palavra
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Corpo do detalhe (sem o Dialog) — reutilizado pela visão Mês. */
export function EntryDetailBody({
  entry,
  paymentPending = false,
}: {
  entry: AgendaEntry;
  paymentPending?: boolean;
}) {
  const color = entry.unit ? UNIT_COLOR[entry.unit] : NO_UNIT_COLOR;
  return (
    <div className="grid gap-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={`size-2.5 shrink-0 rounded-full ${color.dot}`} />
        {entry.unit ? UNIT_LABELS[entry.unit] : "Sem unidade no título"} ·{" "}
        {entry.startLabel} às {entry.endLabel}
      </p>
      {entry.lead?.urgencia && (
        <p>
          <StatusBadge semantic="urgent">sinalização</StatusBadge>
        </p>
      )}
      {paymentPending && (
        <p>
          <StatusBadge semantic="warning">pagamento pendente</StatusBadge>
        </p>
      )}
      <LeadFacts lead={entry.lead} />
    </div>
  );
}

export function AgendaEntryDialog({
  entry,
  onClose,
  paymentPending = false,
}: {
  entry: AgendaEntry | null;
  onClose: () => void;
  paymentPending?: boolean;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      {entry && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{entry.patientLabel || "(sem título)"}</DialogTitle>
            <DialogDescription>{entryDayLabel(entry.dayKey)}</DialogDescription>
          </DialogHeader>
          <EntryDetailBody entry={entry} paymentPending={paymentPending} />
        </DialogContent>
      )}
    </Dialog>
  );
}
