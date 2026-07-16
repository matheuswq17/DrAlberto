"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import type { MessageRow } from "@/lib/conversations";
import { createClient } from "@/lib/supabase/server";
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
  const telefone = String(formData.get("telefone") ?? "");

  const result = await confirmPaymentWebhook({
    idAgendamento: bookingId,
    telefone,
    confirmadoPor: user.id,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: `Não foi possível confirmar o pagamento, tente novamente. (${result.error})`,
    };
  }

  const { error } = await supabase
    .from("procedure_bookings")
    .update({ payment_status: "confirmado", updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) {
    return {
      ok: false,
      error: `Pagamento confirmado no bot, mas falhou ao atualizar o painel: ${error.message}. Recarregue a página.`,
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
  const telefone = String(formData.get("telefone") ?? "");

  const result = await pauseBotWebhook({ telefone, motivo: "manual", pausadoPor: user.id });
  if (!result.ok) {
    return { ok: false, error: `Não foi possível pausar o bot, tente novamente. (${result.error})` };
  }

  const { error } = await supabase
    .from("procedure_bookings")
    .update({ bot_paused: true, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) {
    return {
      ok: false,
      error: `Bot pausado, mas falhou ao atualizar o painel: ${error.message}. Recarregue a página.`,
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
  const telefone = String(formData.get("telefone") ?? "");

  const result = await resumeBotWebhook({ telefone, retomadoPor: user.id });
  if (!result.ok) {
    return { ok: false, error: `Não foi possível retomar o bot, tente novamente. (${result.error})` };
  }

  const { error } = await supabase
    .from("procedure_bookings")
    .update({ bot_paused: false, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) {
    return {
      ok: false,
      error: `Bot retomado, mas falhou ao atualizar o painel: ${error.message}. Recarregue a página.`,
    };
  }

  revalidatePath("/conversas");
  return { ok: true };
}
