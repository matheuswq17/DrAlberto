import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUrgencies } from "@/lib/urgencies";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await getUrgencies(supabase);
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { key, status } = await request.json();
  if (!key || !["aberta", "vista", "resolvida"].includes(status)) {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
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
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
