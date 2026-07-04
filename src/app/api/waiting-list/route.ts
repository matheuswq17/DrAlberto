import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("waiting_list")
    .select("*")
    .neq("status", "removido")
    .order("created_at");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ waitingList: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const preferred = String(body.preferred_unit ?? "");
  const { error } = await supabase.from("waiting_list").insert({
    patient_name: body.patient_name,
    phone: String(body.phone ?? "").replace(/\D/g, ""),
    preferred_unit: ["CRD", "SFA", "EINSTEIN"].includes(preferred)
      ? preferred
      : null,
    notes: body.notes ?? null,
    created_by: user.id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
