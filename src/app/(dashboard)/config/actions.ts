"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function authedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user };
}

export async function addScheduleRow(formData: FormData) {
  const { supabase } = await authedClient();
  const { error } = await supabase.from("unit_schedules").insert({
    unit: String(formData.get("unit")),
    weekday: Number(formData.get("weekday")),
    start_time: String(formData.get("start_time")),
    end_time: String(formData.get("end_time")),
    slot_minutes: Number(formData.get("slot_minutes") || 30),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/config");
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

export async function saveSettings(formData: FormData) {
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
  if (entries.length === 0) return;
  const { error } = await supabase.from("app_settings").upsert(
    entries.map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }))
  );
  if (error) throw new Error(error.message);
  revalidatePath("/config");
}
