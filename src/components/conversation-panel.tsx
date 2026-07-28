"use client";

// Painel de conversa à direita — histórico de whatsapp_messages do paciente
// selecionado, composer de envio manual, e os botões de pagamento/pausa.

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action-state";
import type { ConversationBooking, MessageRow } from "@/lib/conversations";
import { cn } from "@/lib/utils";
import { toastManager } from "@/components/ui/toast";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { MessageCircleIcon } from "lucide-react";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function fmtTs(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function ConversationPanel({
  booking,
  messages,
  loadingMessages,
  onMessageSent,
  onPaymentConfirmed,
  onBotPauseToggled,
  onConversationDeleted,
  sendMessageAction,
  confirmPaymentAction,
  pauseBotAction,
  resumeBotAction,
  deleteConversationAction,
}: {
  booking: ConversationBooking;
  messages: MessageRow[];
  loadingMessages: boolean;
  onMessageSent: (text: string) => void;
  onPaymentConfirmed: () => void;
  onBotPauseToggled: (paused: boolean) => void;
  onConversationDeleted: () => void;
  sendMessageAction: FormAction;
  confirmPaymentAction: FormAction;
  pauseBotAction: FormAction;
  resumeBotAction: FormAction;
  deleteConversationAction: FormAction;
}) {
  const [sendState, sendFormAction] = useActionState<ActionState, FormData>(sendMessageAction, null);
  const [paymentState, paymentFormAction] = useActionState<ActionState, FormData>(confirmPaymentAction, null);
  const [pauseState, pauseFormAction] = useActionState<ActionState, FormData>(pauseBotAction, null);
  const [resumeState, resumeFormAction] = useActionState<ActionState, FormData>(resumeBotAction, null);
  const [deleteState, deleteFormAction] = useActionState<ActionState, FormData>(deleteConversationAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingTextRef = useRef("");

  useEffect(() => {
    if (!sendState) return;
    if (sendState.ok) {
      onMessageSent(pendingTextRef.current);
      formRef.current?.reset();
    } else {
      toastManager.add({ title: sendState.error, type: "error", timeout: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendState]);

  useEffect(() => {
    if (!paymentState) return;
    if (paymentState.ok) {
      toastManager.add({ title: paymentState.message ?? "Pagamento confirmado ✓", type: "success", timeout: 4000 });
      onPaymentConfirmed();
    } else {
      toastManager.add({ title: paymentState.error, type: "error", timeout: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentState]);

  useEffect(() => {
    if (!pauseState) return;
    if (pauseState.ok) {
      toastManager.add({ title: pauseState.message ?? "Bot pausado ✓", type: "success", timeout: 3000 });
      onBotPauseToggled(true);
    } else {
      toastManager.add({ title: pauseState.error, type: "error", timeout: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseState]);

  useEffect(() => {
    if (!resumeState) return;
    if (resumeState.ok) {
      toastManager.add({ title: resumeState.message ?? "Bot retomado ✓", type: "success", timeout: 3000 });
      onBotPauseToggled(false);
    } else {
      toastManager.add({ title: resumeState.error, type: "error", timeout: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeState]);

  useEffect(() => {
    if (!deleteState) return;
    if (deleteState.ok) {
      toastManager.add({ title: deleteState.message ?? "Conversa excluída ✓", type: "success", timeout: 4000 });
      onConversationDeleted();
    } else {
      toastManager.add({ title: deleteState.error, type: "error", timeout: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteState]);

  function confirmDelete(e: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(
      `Excluir a conversa de ${booking.patientName}?\n\n` +
        `Isso apaga o histórico de mensagens e o registro do ${booking.kind === "procedimento" ? "procedimento" : "consulta"}, e libera o bot para esse número. ` +
        "Isso NÃO cancela o evento na agenda — só limpa o histórico de conversa. Essa ação não pode ser desfeita."
    );
    if (!confirmed) e.preventDefault();
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{booking.patientName}</span>
          <StatusBadge semantic={booking.botPaused ? "warning" : "ok"}>
            {booking.botPaused ? "bot pausado" : "bot ativo"}
          </StatusBadge>
        </div>
        <div className="flex items-center gap-2">
          {booking.paymentStatus === "pendente" && (
            <form action={paymentFormAction}>
              <input type="hidden" name="booking_id" value={booking.id} />
              <input type="hidden" name="kind" value={booking.kind} />
              <SubmitButton pendingLabel="Confirmando…" variant="outline" size="sm">
                Confirmar pagamento
              </SubmitButton>
            </form>
          )}
          {booking.botPaused ? (
            <form action={resumeFormAction}>
              <input type="hidden" name="booking_id" value={booking.id} />
              <input type="hidden" name="kind" value={booking.kind} />
              <SubmitButton pendingLabel="Retomando…" variant="outline" size="sm">
                Retomar bot
              </SubmitButton>
            </form>
          ) : (
            <form action={pauseFormAction}>
              <input type="hidden" name="booking_id" value={booking.id} />
              <input type="hidden" name="kind" value={booking.kind} />
              <SubmitButton pendingLabel="Pausando…" variant="outline" size="sm">
                Pausar bot
              </SubmitButton>
            </form>
          )}
          <form action={deleteFormAction} onSubmit={confirmDelete}>
            <input type="hidden" name="booking_id" value={booking.id} />
            <input type="hidden" name="kind" value={booking.kind} />
            <SubmitButton pendingLabel="Excluindo…" variant="destructive" size="sm">
              Excluir conversa
            </SubmitButton>
          </form>
        </div>
      </div>

      <div className="grid gap-2 overflow-y-auto py-2">
        {loadingMessages ? (
          <p className="text-sm text-muted-foreground">Carregando mensagens…</p>
        ) : messages.length === 0 ? (
          <EmptyState icon={MessageCircleIcon}>Nenhuma mensagem ainda.</EmptyState>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                m.direction === "outbound" ? "ml-auto bg-primary/10 text-foreground" : "bg-muted"
              )}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{fmtTs(m.message_ts)}</p>
            </div>
          ))
        )}
      </div>

      <form
        ref={formRef}
        action={sendFormAction}
        onSubmit={(e) => {
          const formData = new FormData(e.currentTarget);
          pendingTextRef.current = String(formData.get("mensagem") ?? "");
        }}
        className="flex items-end gap-2 border-t pt-3"
      >
        <input type="hidden" name="telefone" value={booking.patientPhone} />
        <Textarea name="mensagem" required rows={2} className="flex-1" placeholder="Escreva uma mensagem…" />
        <SubmitButton pendingLabel="Enviando…">Enviar</SubmitButton>
      </form>
    </div>
  );
}
