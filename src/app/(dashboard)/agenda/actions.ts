"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { buildEventTitle } from "@/lib/units";
import { endsAtOf, validateBookingInput } from "@/lib/procedure-booking";
import {
  createProcedureEvent,
  deleteProcedureEvent,
  hasCalendarConflict,
  updateProcedureEvent,
} from "@/lib/google/procedure-events";
import {
  cancelProcedureWebhook,
  notifyProcedureBooking,
  rescheduleProcedureWebhook,
} from "@/lib/n8n-webhook";
import { createClient } from "@/lib/supabase/server";

async function authedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

/**
 * Marca um procedimento pelo painel: relê o Calendar para checar conflito,
 * cria o evento real (única escrita no Calendar de todo o projeto), grava
 * `procedure_bookings` e avisa o bot n8n. Falha no webhook NUNCA desfaz o
 * evento/registro já criados — só volta um aviso para o médico notificar
 * manualmente (evita duplo-agendamento por retry às cegas).
 */
export async function bookProcedure(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await authedClient();

  const validation = validateBookingInput({
    procedureId: String(formData.get("procedure_id") ?? ""),
    procedureName: String(formData.get("procedure_name") ?? ""),
    patientName: String(formData.get("patient_name") ?? ""),
    patientPhone: String(formData.get("patient_phone") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    startsAtIso: String(formData.get("starts_at") ?? ""),
    durationMinutes: Number(formData.get("duration_minutes") || 30),
    price: Number(String(formData.get("price") ?? "").replace(",", ".")),
  });
  if (!validation.ok) return validation;

  const { value } = validation;
  const endsAt = endsAtOf(value.startsAt, value.durationMinutes);

  let conflict: boolean;
  try {
    conflict = await hasCalendarConflict(value.startsAt, endsAt);
  } catch (err) {
    return {
      ok: false,
      error: `Falha ao checar conflito no Calendar: ${(err as Error).message}`,
    };
  }
  if (conflict) {
    return { ok: false, error: "Esse horário já está ocupado, escolha outro." };
  }

  const title = buildEventTitle(value.unit, value.patientName, value.procedureName);
  let eventId: string;
  try {
    eventId = await createProcedureEvent({ title, startsAt: value.startsAt, endsAt });
  } catch (err) {
    return {
      ok: false,
      error: `Falha ao criar o evento no Calendar: ${(err as Error).message}`,
    };
  }

  const { data: booking, error: insertError } = await supabase
    .from("procedure_bookings")
    .insert({
      patient_name: value.patientName,
      patient_phone: value.patientPhone,
      procedure_id: value.procedureId,
      unit: value.unit,
      starts_at: value.startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      price: value.price,
      calendar_event_id: eventId,
      booked_by: user.id,
      bot_paused: true,
    })
    .select("id")
    .single();

  if (insertError || !booking) {
    // Evento já existe no Calendar mas ficou órfão no painel — detalhe
    // técnico só no log do servidor, para reconciliar manualmente depois.
    console.error(
      `bookProcedure: evento ${eventId} criado no Calendar mas insert em procedure_bookings falhou:`,
      insertError?.message
    );
    return {
      ok: false,
      error: `Evento criado no Calendar (id ${eventId}), mas falhou ao gravar no painel: ${insertError?.message ?? "erro desconhecido"}. Não marque de novo sem checar o Calendar — avise o suporte.`,
    };
  }

  revalidatePath("/agenda");

  const webhookResult = await notifyProcedureBooking({
    telefone: value.patientPhone,
    nomePaciente: value.patientName,
    procedimento: value.procedureName,
    unidade: value.unit,
    dataHoraInicio: value.startsAt.toISOString(),
    dataHoraFim: endsAt.toISOString(),
    valor: value.price,
    eventIdCalendar: eventId,
    idAgendamento: booking.id,
  });

  if (!webhookResult.ok) {
    return {
      ok: true,
      message: `Procedimento marcado ✓, mas houve falha ao notificar o paciente — avise manualmente (${webhookResult.error}).`,
    };
  }
  return { ok: true, message: "Procedimento marcado ✓" };
}

/**
 * Desmarca um procedimento: apaga o evento do Calendar, marca
 * `canceled_at` (soft delete — preserva histórico pra Conversas e consulta
 * futura do médico) e avisa o bot n8n, que libera a pausa automaticamente
 * do lado dele. Falha no webhook não desfaz o cancelamento já persistido —
 * só avisa no toast.
 */
export async function cancelProcedure(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await authedClient();
  const bookingId = String(formData.get("booking_id") ?? "");

  const { data: bookingRow, error: fetchError } = await supabase
    .from("procedure_bookings")
    .select("patient_name, patient_phone, calendar_event_id, canceled_at, procedures(name)")
    .eq("id", bookingId)
    .single();
  if (fetchError || !bookingRow) {
    return { ok: false, error: "Não foi possível localizar o agendamento." };
  }
  if (bookingRow.canceled_at) {
    return { ok: false, error: "Esse procedimento já foi desmarcado." };
  }

  try {
    await deleteProcedureEvent(bookingRow.calendar_event_id);
  } catch (err) {
    return {
      ok: false,
      error: `Falha ao apagar o evento no Calendar: ${(err as Error).message}`,
    };
  }

  const { error: updateError } = await supabase
    .from("procedure_bookings")
    .update({ canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (updateError) {
    return {
      ok: false,
      error: `Evento apagado do Calendar, mas falhou ao gravar no painel: ${updateError.message}. Avise o suporte.`,
    };
  }

  revalidatePath("/agenda");

  const procedure = Array.isArray(bookingRow.procedures)
    ? bookingRow.procedures[0]
    : bookingRow.procedures;
  const webhookResult = await cancelProcedureWebhook({
    telefone: bookingRow.patient_phone,
    nomePaciente: bookingRow.patient_name,
    procedimento: procedure?.name ?? "",
    idAgendamento: bookingId,
  });
  if (!webhookResult.ok) {
    return {
      ok: true,
      message: `Procedimento desmarcado ✓, mas houve falha ao notificar o paciente — avise manualmente (${webhookResult.error}).`,
    };
  }
  return { ok: true, message: "Procedimento desmarcado ✓" };
}

/**
 * Reagenda um procedimento: relê o Calendar para checar conflito no novo
 * horário (ignorando o próprio evento), atualiza o evento existente (PATCH,
 * não recria), grava starts_at/ends_at e avisa o bot n8n da nova data.
 */
export async function rescheduleProcedure(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await authedClient();
  const bookingId = String(formData.get("booking_id") ?? "");
  const newDate = String(formData.get("new_date") ?? "");
  const newTime = String(formData.get("new_time") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !/^\d{2}:\d{2}$/.test(newTime)) {
    return { ok: false, error: "Informe data e horário válidos." };
  }
  // América/São Paulo é UTC-3 fixo (sem horário de verão desde 2019) — mesma
  // convenção usada em procedure-booking-dialog.tsx e src/lib/agenda.ts.
  const startsAt = new Date(`${newDate}T${newTime}:00-03:00`);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "Informe data e horário válidos." };
  }

  const { data: bookingRow, error: fetchError } = await supabase
    .from("procedure_bookings")
    .select(
      "patient_name, patient_phone, unit, calendar_event_id, starts_at, ends_at, canceled_at, procedures(name)"
    )
    .eq("id", bookingId)
    .single();
  if (fetchError || !bookingRow) {
    return { ok: false, error: "Não foi possível localizar o agendamento." };
  }
  if (bookingRow.canceled_at) {
    return { ok: false, error: "Esse procedimento já foi desmarcado." };
  }

  const durationMinutes = Math.round(
    (new Date(bookingRow.ends_at).getTime() - new Date(bookingRow.starts_at).getTime()) / 60_000
  );
  const endsAt = endsAtOf(startsAt, durationMinutes);

  let conflict: boolean;
  try {
    conflict = await hasCalendarConflict(startsAt, endsAt, bookingRow.calendar_event_id);
  } catch (err) {
    return {
      ok: false,
      error: `Falha ao checar conflito no Calendar: ${(err as Error).message}`,
    };
  }
  if (conflict) {
    return { ok: false, error: "Esse horário já está ocupado, escolha outro." };
  }

  try {
    await updateProcedureEvent(bookingRow.calendar_event_id, startsAt, endsAt);
  } catch (err) {
    return {
      ok: false,
      error: `Falha ao atualizar o evento no Calendar: ${(err as Error).message}`,
    };
  }

  const { error: updateError } = await supabase
    .from("procedure_bookings")
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (updateError) {
    return {
      ok: false,
      error: `Evento atualizado no Calendar, mas falhou ao gravar no painel: ${updateError.message}. Avise o suporte.`,
    };
  }

  revalidatePath("/agenda");

  const procedure = Array.isArray(bookingRow.procedures)
    ? bookingRow.procedures[0]
    : bookingRow.procedures;
  const webhookResult = await rescheduleProcedureWebhook({
    telefone: bookingRow.patient_phone,
    nomePaciente: bookingRow.patient_name,
    procedimento: procedure?.name ?? "",
    unidade: bookingRow.unit,
    dataHoraInicioNova: startsAt.toISOString(),
    dataHoraFimNova: endsAt.toISOString(),
    idAgendamento: bookingId,
  });
  if (!webhookResult.ok) {
    return {
      ok: true,
      message: `Data/hora alterada ✓, mas houve falha ao notificar o paciente — avise manualmente (${webhookResult.error}).`,
    };
  }
  return { ok: true, message: "Data/hora alterada ✓" };
}
