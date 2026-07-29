"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import type { MessageRow } from "@/lib/conversations";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  confirmPaymentWebhook,
  pauseBotWebhook,
  resumeBotWebhook,
  sendManualWhatsappMessage,
} from "@/lib/n8n-webhook";

async function authedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

/**
 * Últimas mensagens de um telefone, mais antigas primeiro (pronto pra
 * render). Chamada diretamente pelo clique no paciente na lista — não é
 * uma action ligada a um <form>, é uma leitura sob demanda.
 */
export async function getMessages(phone: string): Promise<MessageRow[]> {
  const { supabase } = await authedClient();
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("id, phone, direction, content, message_ts")
    .eq("phone", phone)
    .order("message_ts", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return ((data ?? []) as MessageRow[]).reverse();
}

export async function sendManualMessage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { user } = await authedClient();
  const telefone = String(formData.get("telefone") ?? "");
  const mensagem = String(formData.get("mensagem") ?? "").trim();
  if (!mensagem) {
    return { ok: false, error: "Escreva uma mensagem antes de enviar." };
  }

  const result = await sendManualWhatsappMessage({ telefone, mensagem, enviadoPor: user.id });
  if (!result.ok) {
    return {
      ok: false,
      error: `Não foi possível enviar a mensagem, tente novamente. (${result.error})`,
    };
  }
  return { ok: true };
}

export async function confirmPayment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await authedClient();
  const bookingId = String(formData.get("booking_id") ?? "");
  const kind = String(formData.get("kind") ?? "procedimento") as "procedimento" | "consulta";
  const table = kind === "consulta" ? "consultation_bookings" : "procedure_bookings";

  const { data: bookingRow, error: fetchError } = await supabase
    .from(table)
    .select("patient_phone")
    .eq("id", bookingId)
    .single();
  if (fetchError || !bookingRow) {
    return { ok: false, error: "Não foi possível localizar o agendamento." };
  }
  const telefone = bookingRow.patient_phone;

  const result = await confirmPaymentWebhook({
    idAgendamento: bookingId,
    telefone,
    confirmadoPor: user.id,
    kind,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: `Não foi possível confirmar o pagamento, tente novamente. (${result.error})`,
    };
  }

  const { error } = await supabase
    .from(table)
    .update({ payment_status: "confirmado", updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) {
    return {
      ok: true,
      message: `Pagamento confirmado ✓, mas o painel não sincronizou localmente (${error.message}) — recarregue a página para conferir.`,
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/conversas");
  return { ok: true };
}

export async function pauseBot(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await authedClient();
  const bookingId = String(formData.get("booking_id") ?? "");
  const kind = String(formData.get("kind") ?? "procedimento");
  const table = kind === "consulta" ? "consultation_bookings" : "procedure_bookings";

  const { data: bookingRow, error: fetchError } = await supabase
    .from(table)
    .select("patient_phone")
    .eq("id", bookingId)
    .single();
  if (fetchError || !bookingRow) {
    return { ok: false, error: "Não foi possível localizar o agendamento." };
  }
  const telefone = bookingRow.patient_phone;

  const result = await pauseBotWebhook({ telefone, motivo: "manual", pausadoPor: user.id });
  if (!result.ok) {
    return { ok: false, error: `Não foi possível pausar o bot, tente novamente. (${result.error})` };
  }

  const { error } = await supabase
    .from(table)
    .update({ bot_paused: true, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) {
    return {
      ok: true,
      message: `Bot pausado ✓, mas o painel não sincronizou localmente (${error.message}) — recarregue a página para conferir.`,
    };
  }

  revalidatePath("/conversas");
  return { ok: true };
}

export async function resumeBot(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await authedClient();
  const bookingId = String(formData.get("booking_id") ?? "");
  const kind = String(formData.get("kind") ?? "procedimento");
  const table = kind === "consulta" ? "consultation_bookings" : "procedure_bookings";

  const { data: bookingRow, error: fetchError } = await supabase
    .from(table)
    .select("patient_phone")
    .eq("id", bookingId)
    .single();
  if (fetchError || !bookingRow) {
    return { ok: false, error: "Não foi possível localizar o agendamento." };
  }
  const telefone = bookingRow.patient_phone;

  const result = await resumeBotWebhook({ telefone, retomadoPor: user.id });
  if (!result.ok) {
    return { ok: false, error: `Não foi possível retomar o bot, tente novamente. (${result.error})` };
  }

  const { error } = await supabase
    .from(table)
    .update({ bot_paused: false, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) {
    return {
      ok: true,
      message: `Bot retomado ✓, mas o painel não sincronizou localmente (${error.message}) — recarregue a página para conferir.`,
    };
  }

  revalidatePath("/conversas");
  return { ok: true };
}

/**
 * Exclui a conversa: libera o bot no n8n (evita pausa "órfã" no Redis pra
 * esse telefone), apaga o histórico de whatsapp_messages e o registro de
 * procedure_bookings. NÃO mexe no evento do Google Calendar — cancelar o
 * agendamento é uma ação diferente, fora do escopo deste botão. Falha no
 * webhook não bloqueia a exclusão (evita deixar lixo de teste preso por
 * causa de uma falha pontual do bot) — só avisa no toast.
 */
export async function deleteConversation(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await authedClient();
  const bookingId = String(formData.get("booking_id") ?? "");
  const kind = String(formData.get("kind") ?? "procedimento");
  const table = kind === "consulta" ? "consultation_bookings" : "procedure_bookings";

  const { data: bookingRow, error: fetchError } = await supabase
    .from(table)
    .select("patient_phone")
    .eq("id", bookingId)
    .single();
  if (fetchError || !bookingRow) {
    return { ok: false, error: "Não foi possível localizar o agendamento." };
  }
  const telefone = bookingRow.patient_phone;

  const webhookResult = await resumeBotWebhook({ telefone, retomadoPor: user.id });

  // whatsapp_messages só tem policy de RLS de select para authenticated (só
  // o worker/service role escreve ali por padrão) — precisa do admin client
  // pra esse delete específico, senão o Supabase bloqueia silenciosamente
  // (0 linhas afetadas, sem erro) e a mensagem fica órfã.
  const admin = createAdminClient();
  const { error: messagesError } = await admin
    .from("whatsapp_messages")
    .delete()
    .eq("phone", telefone);
  if (messagesError) {
    return { ok: false, error: `Não foi possível apagar as mensagens: ${messagesError.message}` };
  }

  const { error: bookingError } = await supabase
    .from(table)
    .delete()
    .eq("id", bookingId);
  if (bookingError) {
    return { ok: false, error: `Não foi possível apagar o agendamento: ${bookingError.message}` };
  }

  revalidatePath("/conversas");
  revalidatePath("/agenda");

  if (!webhookResult.ok) {
    return {
      ok: true,
      message: `Conversa excluída ✓, mas não foi possível liberar o bot para esse número — avise manualmente. (${webhookResult.error})`,
    };
  }
  return { ok: true, message: "Conversa excluída ✓" };
}
