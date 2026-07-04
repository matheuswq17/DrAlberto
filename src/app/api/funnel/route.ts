import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchLeads } from "@/lib/google/sheets";
import { computeFunnel } from "@/lib/metrics";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const leads = await fetchLeads();
    return NextResponse.json(computeFunnel(leads));
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
