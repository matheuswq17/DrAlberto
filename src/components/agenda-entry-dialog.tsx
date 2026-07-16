"use client";

// Modal de detalhe de uma consulta na Agenda (Semana e Mês) — mesma ficha
// estruturada da visão Dia (LeadFacts), dentro de um Dialog. Quando a
// consulta é um procedimento marcado pelo painel (não uma consulta do bot),
// mostra também os botões "Alterar data/hora" e "Desmarcar".

import { useActionState, useEffect, useState } from "react";
import type { AgendaEntry } from "@/lib/agenda";
import { spDayKey, spWallMinutes } from "@/lib/sp-time";
import type { ActionState } from "@/lib/action-state";
import type { ProcedureBookingSummary } from "@/lib/procedures";
import { UNIT_COLOR, UNIT_LABELS, NO_UNIT_COLOR } from "@/lib/units";
import { LeadFacts } from "@/components/patient-info";
import { StatusBadge } from "@/components/status-badge";
import { toastManager } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

async function noopAction(prev: ActionState): Promise<ActionState> {
  return prev;
}

export function entryDayLabel(dayKey: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${dayKey}T12:00:00`));
  // só a primeira letra — text-transform: capitalize maiusculiza toda palavra
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function timeOf(iso: string): string {
  const min = spWallMinutes(iso);
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Corpo do detalhe (sem o Dialog) — reutilizado pela visão Mês. */
export function EntryDetailBody({
  entry,
  paymentPending = false,
  procedureBooking,
  cancelAction,
  rescheduleAction,
  onClose,
}: {
  entry: AgendaEntry;
  paymentPending?: boolean;
  procedureBooking?: ProcedureBookingSummary;
  cancelAction?: FormAction;
  rescheduleAction?: FormAction;
  onClose?: () => void;
}) {
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [cancelState, cancelFormAction] = useActionState<ActionState, FormData>(
    cancelAction ?? noopAction,
    null
  );
  const [rescheduleState, rescheduleFormAction] = useActionState<ActionState, FormData>(
    rescheduleAction ?? noopAction,
    null
  );

  useEffect(() => {
    if (!cancelState) return;
    if (cancelState.ok) {
      toastManager.add({
        title: cancelState.message ?? "Procedimento desmarcado ✓",
        type: "success",
        timeout: 4000,
      });
      onClose?.();
    } else {
      toastManager.add({ title: cancelState.error, type: "error", timeout: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelState]);

  useEffect(() => {
    if (!rescheduleState) return;
    if (rescheduleState.ok) {
      toastManager.add({
        title: rescheduleState.message ?? "Data/hora alterada ✓",
        type: "success",
        timeout: 4000,
      });
      onClose?.();
    } else {
      toastManager.add({ title: rescheduleState.error, type: "error", timeout: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleState]);

  function confirmCancel(e: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Desmarcar o procedimento de ${procedureBooking?.patientName ?? entry.patientLabel}?\n\n` +
        "Isso apaga o evento da agenda e avisa o paciente pelo WhatsApp. Essa ação não pode ser desfeita."
    );
    if (!confirmed) e.preventDefault();
  }

  if (mode === "reschedule" && procedureBooking) {
    return (
      <form action={rescheduleFormAction} className="grid gap-4">
        <input type="hidden" name="booking_id" value={procedureBooking.id} />
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new_date">Novo dia</Label>
            <Input
              id="new_date"
              name="new_date"
              type="date"
              required
              defaultValue={spDayKey(procedureBooking.startsAt)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new_time">Novo horário</Label>
            <Input
              id="new_time"
              name="new_time"
              type="time"
              required
              defaultValue={timeOf(procedureBooking.startsAt)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setMode("view")}>
            Cancelar
          </Button>
          <SubmitButton pendingLabel="Salvando…">Salvar novo horário</SubmitButton>
        </div>
      </form>
    );
  }

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
      {procedureBooking && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setMode("reschedule")}>
            Alterar data/hora
          </Button>
          <form action={cancelFormAction} onSubmit={confirmCancel}>
            <input type="hidden" name="booking_id" value={procedureBooking.id} />
            <SubmitButton pendingLabel="Desmarcando…" variant="destructive" size="sm">
              Desmarcar
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

export function AgendaEntryDialog({
  entry,
  onClose,
  paymentPending = false,
  procedureBooking,
  cancelAction,
  rescheduleAction,
}: {
  entry: AgendaEntry | null;
  onClose: () => void;
  paymentPending?: boolean;
  procedureBooking?: ProcedureBookingSummary;
  cancelAction?: FormAction;
  rescheduleAction?: FormAction;
}) {
  return (
    <Dialog open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      {entry && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{entry.patientLabel || "(sem título)"}</DialogTitle>
            <DialogDescription>{entryDayLabel(entry.dayKey)}</DialogDescription>
          </DialogHeader>
          <EntryDetailBody
            key={entry.id}
            entry={entry}
            paymentPending={paymentPending}
            procedureBooking={procedureBooking}
            cancelAction={cancelAction}
            rescheduleAction={rescheduleAction}
            onClose={onClose}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
