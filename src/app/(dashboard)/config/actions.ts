"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import {
  findScheduleConflict,
  isValidTimeRange,
  type ScheduleRowLike,
} from "@/lib/schedule-conflict";
import { createClient } from "@/lib/supabase/server";

async function authedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

const WEEKDAY_LABELS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

function conflictMessage(conflict: ScheduleRowLike): string {
  return `Já existe grade nesse horário: ${WEEKDAY_LABELS[conflict.weekday]}, ${conflict.start_time.slice(0, 5)}–${conflict.end_time.slice(0, 5)}.`;
}

export async function addScheduleRow(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await authedClient();
  const unit = String(formData.get("unit"));
  const weekday = Number(formData.get("weekday"));
  const start_time = String(formData.get("start_time"));
  const end_time = String(formData.get("end_time"));
  const slot_minutes = Number(formData.get("slot_minutes") || 30);

  if (!start_time || !end_time || !isValidTimeRange(start_time, end_time)) {
    return { ok: false, error: "O horário de início precisa ser antes do fim." };
  }

  // Revalida no servidor mesmo que o cliente já tenha bloqueado — nunca
  // confia só na checagem do navegador para não salvar uma grade inválida.
  const { data: existingRows } = await supabase
    .from("unit_schedules")
    .select("id, unit, weekday, start_time, end_time")
    .eq("unit", unit);
  const conflict = findScheduleConflict(
    { unit, weekday, start_time, end_time },
    (existingRows ?? []) as ScheduleRowLike[]
  );
  if (conflict) return { ok: false, error: conflictMessage(conflict) };

  const { error } = await supabase.from("unit_schedules").insert({
    unit,
    weekday,
    start_time,
    end_time,
    slot_minutes,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/config");
  return { ok: true };
}

export async function deleteScheduleRow(formData: FormData) {
  const { supabase } = await authedClient();
  const { error } = await supabase
    .from("unit_schedules")
    .delete()
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/config");
}

/**
 * Copia uma grade existente para um ou mais dias de destino, na mesma
 * unidade/horário/duração. Dias com conflito são pulados (nunca sobrescreve
 * ou duplica silenciosamente) — o resumo de quantos entraram/foram pulados
 * volta para a interface mostrar.
 */
export async function copyScheduleRow(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase } = await authedClient();
  const sourceId = String(formData.get("source_id") ?? "");
  const targetWeekdays = formData
    .getAll("target_weekday")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

  if (!sourceId) {
    return { ok: false, error: "Selecione a grade de origem." };
  }
  if (targetWeekdays.length === 0) {
    return { ok: false, error: "Selecione ao menos um dia de destino." };
  }

  const { data: source } = await supabase
    .from("unit_schedules")
    .select("*")
    .eq("id", sourceId)
    .single();
  if (!source) return { ok: false, error: "Grade de origem não encontrada." };

  const { data: existingRows } = await supabase
    .from("unit_schedules")
    .select("id, unit, weekday, start_time, end_time")
    .eq("unit", source.unit);
  const existing = (existingRows ?? []) as ScheduleRowLike[];

  const toInsert: Array<{
    unit: string;
    weekday: number;
    start_time: string;
    end_time: string;
    slot_minutes: number;
  }> = [];
  let skipped = 0;
  for (const weekday of targetWeekdays) {
    if (weekday === source.weekday) {
      skipped += 1;
      continue;
    }
    const candidate = {
      unit: source.unit,
      weekday,
      start_time: source.start_time,
      end_time: source.end_time,
    };
    if (findScheduleConflict(candidate, existing)) {
      skipped += 1;
      continue;
    }
    toInsert.push({ ...candidate, slot_minutes: source.slot_minutes });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("unit_schedules").insert(toInsert);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/config");
  }

  if (toInsert.length === 0) {
    return {
      ok: false,
      error: "Nenhum dia copiado — todos os dias escolhidos já têm grade conflitante.",
    };
  }
  return {
    ok: true,
    message:
      skipped > 0
        ? `${toInsert.length} dia${toInsert.length > 1 ? "s" : ""} copiado${toInsert.length > 1 ? "s" : ""}, ${skipped} pulado${skipped > 1 ? "s" : ""} por conflito.`
        : `${toInsert.length} dia${toInsert.length > 1 ? "s" : ""} copiado${toInsert.length > 1 ? "s" : ""} ✓`,
  };
}

export async function saveSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await authedClient();
  // Cada bloco da Config tem seu próprio form; só grava as chaves presentes
  // no form enviado, para um bloco não sobrescrever os valores do outro.
  const entries: Array<[string, string]> = [];
  if (formData.has("report_phone")) {
    entries.push([
      "report_phone",
      String(formData.get("report_phone") ?? "").replace(/\D/g, ""),
    ]);
  }
  if (formData.has("report_period")) {
    entries.push([
      "report_period",
      String(formData.get("report_period") ?? "semanal"),
    ]);
  }
  if (formData.has("followup_lead_days")) {
    entries.push([
      "followup_lead_days",
      String(Number(formData.get("followup_lead_days") || 3)),
    ]);
  }
  if (formData.has("daily_summary_enabled")) {
    entries.push([
      "daily_summary_enabled",
      formData.get("daily_summary_enabled") === "true" ? "true" : "false",
    ]);
  }
  if (entries.length === 0) return { ok: true };
  const { error } = await supabase.from("app_settings").upsert(
    entries.map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }))
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/config");
  return { ok: true };
}
