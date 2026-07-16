"use client";

// Estado local da aba Conversas: qual paciente está selecionado, as
// mensagens carregadas para ele, e os updates otimistas (sem esperar
// reload) quando uma ação tem sucesso.

import { useEffect, useState, useTransition } from "react";
import type { ActionState } from "@/lib/action-state";
import type { ConversationBooking, MessageRow } from "@/lib/conversations";
import { ConversationList } from "@/components/conversation-list";
import { ConversationPanel } from "@/components/conversation-panel";
import { EmptyState } from "@/components/empty-state";
import { MessageCircleIcon } from "lucide-react";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ConversationsView({
  initialBookings,
  getMessagesAction,
  sendMessageAction,
  confirmPaymentAction,
  pauseBotAction,
  resumeBotAction,
  deleteConversationAction,
}: {
  initialBookings: ConversationBooking[];
  getMessagesAction: (phone: string) => Promise<MessageRow[]>;
  sendMessageAction: FormAction;
  confirmPaymentAction: FormAction;
  pauseBotAction: FormAction;
  resumeBotAction: FormAction;
  deleteConversationAction: FormAction;
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMessages, startLoadingMessages] = useTransition();

  const selected = bookings.find((b) => b.id === selectedId) ?? null;

  function selectBooking(id: string) {
    setSelectedId(id);
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;
    startLoadingMessages(async () => {
      const rows = await getMessagesAction(booking.patientPhone);
      setMessages(rows);
    });
  }

  useEffect(() => {
    if (initialBookings[0]) selectBooking(initialBookings[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualização automática da conversa aberta — sem isso, mensagens novas do
  // paciente só apareceriam depois de um F5 manual. Refetch silencioso (sem
  // passar por startLoadingMessages) para não piscar "Carregando…" a cada
  // 4s; o interval é recriado a cada troca de paciente e o cleanup do efeito
  // já cobre tanto a troca quanto sair da aba (unmount).
  useEffect(() => {
    const phone = selected?.patientPhone;
    if (!phone) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const rows = await getMessagesAction(phone);
      if (!cancelled) setMessages(rows);
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function handleMessageSent(text: string) {
    if (!selected) return;
    const optimistic: MessageRow = {
      id: `optimistic-${Date.now()}`,
      phone: selected.patientPhone,
      direction: "outbound",
      content: text,
      message_ts: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setBookings((prev) => prev.map((b) => (b.id === selected.id ? { ...b, botPaused: true } : b)));
  }

  function handlePaymentConfirmed() {
    if (!selected) return;
    setBookings((prev) =>
      prev.map((b) => (b.id === selected.id ? { ...b, paymentStatus: "confirmado" as const } : b))
    );
  }

  function handleBotPauseToggled(paused: boolean) {
    if (!selected) return;
    setBookings((prev) => prev.map((b) => (b.id === selected.id ? { ...b, botPaused: paused } : b)));
  }

  function handleConversationDeleted() {
    if (!selected) return;
    setBookings((prev) => prev.filter((b) => b.id !== selected.id));
    setSelectedId(null);
    setMessages([]);
  }

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-220px)] lg:grid-cols-[320px_1fr]">
      <div className="overflow-y-auto rounded-lg border bg-card">
        <ConversationList bookings={bookings} selectedId={selectedId} onSelect={selectBooking} />
      </div>
      <div className="rounded-lg border bg-card p-4">
        {selected ? (
          <ConversationPanel
            booking={selected}
            messages={messages}
            loadingMessages={loadingMessages}
            onMessageSent={handleMessageSent}
            onPaymentConfirmed={handlePaymentConfirmed}
            onBotPauseToggled={handleBotPauseToggled}
            onConversationDeleted={handleConversationDeleted}
            sendMessageAction={sendMessageAction}
            confirmPaymentAction={confirmPaymentAction}
            pauseBotAction={pauseBotAction}
            resumeBotAction={resumeBotAction}
            deleteConversationAction={deleteConversationAction}
          />
        ) : (
          <EmptyState icon={MessageCircleIcon}>Selecione um paciente para ver a conversa.</EmptyState>
        )}
      </div>
    </div>
  );
}
