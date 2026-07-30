import { createClient } from "@/lib/supabase/server";
import { getConversationBookings } from "@/lib/conversations";
import {
  getMessages,
  sendManualMessage,
  confirmPayment,
  confirmInsurance,
  pauseBot,
  resumeBot,
  deleteConversation,
} from "./actions";
import { ConversationsView } from "@/components/conversations-view";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function ConversasPage() {
  const supabase = await createClient();
  const bookings = await getConversationBookings(supabase);

  return (
    <div className="grid gap-6 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Conversas"
        title="Conversas"
        description="Histórico de WhatsApp dos pacientes com procedimento ou consulta marcados. Envio manual pausa o bot automaticamente para esse número."
      />
      <ConversationsView
        initialBookings={bookings}
        getMessagesAction={getMessages}
        sendMessageAction={sendManualMessage}
        confirmPaymentAction={confirmPayment}
        confirmInsuranceAction={confirmInsurance}
        pauseBotAction={pauseBot}
        resumeBotAction={resumeBot}
        deleteConversationAction={deleteConversation}
      />
    </div>
  );
}
