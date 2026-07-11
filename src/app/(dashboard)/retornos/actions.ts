"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";

const STATUSES = [
  "pendente",
  "lembrete_enviado",
  "agendado",
  "concluido",
  "cancelado",
];

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

export async function addFollowUp(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await authed();
  const { error } = await supabase.from("follow_ups").insert({
    patient_name: String(formData.get("patient_name")).trim(),
    phone: String(formData.get("phone")).replace(/\D/g, ""),
    procedure: String(formData.get("procedure")).trim(),
    procedure_date: String(formData.get("procedure_date")),
    due_date: String(formData.get("due_date")),
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/retornos");
  return { ok: true };
}

export async function setFollowUpStatus(formData: FormData) {
  const { supabase } = await authed();
  const status = String(formData.get("status"));
  if (!STATUSES.includes(status)) throw new Error("Status inválido");
  const { error } = await supabase
    .from("follow_ups")
    .update({ status })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/retornos");
}
