import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodayAgenda } from "@/lib/today";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const agenda = await getTodayAgenda();
    return NextResponse.json(agenda);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
