"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/evolution";
import { offerMessage, type FreedSlotRow, type WaitingRow } from "@/lib/reschedule";
import { UNIT_LABELS, type UnitId } from "@/lib/units";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

export async function addToWaitingList(formData: FormData) {
  const { supabase, user } = await authed();
  const preferred = String(formData.get("preferred_unit") ?? "");
  const { error } = await supabase.from("waiting_list").insert({
    patient_name: String(formData.get("patient_name")).trim(),
    phone: String(formData.get("phone")).replace(/\D/g, ""),
    preferred_unit: ["CRD", "SFA", "EINSTEIN"].includes(preferred)
      ? preferred
      : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/radar");
}

export async function removeFromWaitingList(formData: FormData) {
  const { supabase } = await authed();
  const { error } = await supabase
    .from("waiting_list")
    .update({ status: "removido" })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/radar");
}

/** Aprovar = envia a oferta por WhatsApp. O site NÃO escreve no Calendar. */
export async function approveSuggestion(formData: FormData) {
  const { supabase, user } = await authed();
  const slotId = String(formData.get("slot_id"));
  const waitingId = String(formData.get("waiting_id"));

  const [{ data: slot }, { data: patient }] = await Promise.all([
    supabase.from("freed_slots").select("*").eq("id", slotId).single(),
    supabase.from("waiting_list").select("*").eq("id", waitingId).single(),
  ]);
  if (!slot || !patient) throw new Error("Vaga ou paciente não encontrado");

  const s = slot as FreedSlotRow;
  const p = patient as WaitingRow;
  const unitLabel = s.unit ? UNIT_LABELS[s.unit as UnitId] : "a combinar";

  const result = await sendWhatsAppMessage({
    phone: p.phone,
    body: offerMessage(p.patient_name, s, unitLabel),
    kind: "oferta_remanejamento",
    relatedId: s.id,
    sentBy: user.id,
  });
  if (!result.ok) {
    throw new Error(`Envio falhou: ${result.error}`);
  }

  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("reschedule_suggestions").insert({
      freed_slot_id: s.id,
      waiting_list_id: p.id,
      status: "aprovada_enviada",
      decided_by: user.id,
      decided_at: now,
      sent_at: now,
    }),
    supabase.from("freed_slots").update({ status: "sugerida" }).eq("id", s.id),
    supabase
      .from("waiting_list")
      .update({ status: "contactado" })
      .eq("id", p.id),
  ]);
  revalidatePath("/radar");
}

/** Rejeitar candidato = registra a rejeição; o próximo da fila é sugerido. */
export async function rejectSuggestion(formData: FormData) {
  const { supabase, user } = await authed();
  const { error } = await supabase.from("reschedule_suggestions").insert({
    freed_slot_id: String(formData.get("slot_id")),
    waiting_list_id: String(formData.get("waiting_id")),
    status: "rejeitada",
    decided_by: user.id,
    decided_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/radar");
}

export async function ignoreSlot(formData: FormData) {
  const { supabase } = await authed();
  const { error } = await supabase
    .from("freed_slots")
    .update({ status: "ignorada" })
    .eq("id", String(formData.get("slot_id")));
  if (error) throw new Error(error.message);
  revalidatePath("/radar");
}
