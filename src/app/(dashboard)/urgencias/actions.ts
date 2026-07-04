"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UrgencyStatus } from "@/lib/urgencies";

export async function setUrgencyStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const key = String(formData.get("key"));
  const status = String(formData.get("status")) as UrgencyStatus;
  if (!["aberta", "vista", "resolvida"].includes(status)) {
    throw new Error("Status inválido");
  }

  const { error } = await supabase.from("urgency_reviews").upsert(
    {
      sheet_row_key: key,
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    },
    { onConflict: "sheet_row_key" }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/urgencias");
}
