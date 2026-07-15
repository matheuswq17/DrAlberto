"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { buildEventTitle } from "@/lib/units";
import { endsAtOf, validateBookingInput } from "@/lib/procedure-booking";
import {
  createProcedureEvent,
  hasCalendarConflict,
} from "@/lib/google/procedure-events";
import { notifyProcedureBooking } from "@/lib/n8n-webhook";
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
