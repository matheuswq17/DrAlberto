import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConversationBooking {
  id: string;
  patientName: string;
  patientPhone: string;
  procedureName: string;
  paymentStatus: "pendente" | "confirmado";
  botPaused: boolean;
  createdAt: string;
}

export interface MessageRow {
  id: string;
  phone: string;
  direction: "inbound" | "outbound";
  content: string;
  message_ts: string;
}

interface BookingRow {
  id: string;
  patient_name: string;
  patient_phone: string;
  payment_status: "pendente" | "confirmado";
  bot_paused: boolean;
  created_at: string;
  procedures: { name: string } | { name: string }[] | null;
}

/**
 * Pacientes com procedimento marcado, mais recentes primeiro — fonte da
 * lista da aba Conversas (fase 1: só procedimentos, não unifica com o
 * histórico de consultas normais do bot ainda).
 */
export async function getConversationBookings(
  supabase: SupabaseClient
): Promise<ConversationBooking[]> {
  const { data, error } = await supabase
    .from("procedure_bookings")
    .select("id, patient_name, patient_phone, payment_status, bot_paused, created_at, procedures(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as BookingRow[]).map((row) => {
    // supabase-js pode devolver o relacionamento como objeto único ou como
    // array de 1 elemento dependendo de como infere a cardinalidade — trata
    // os dois formatos defensivamente.
    const procedure = Array.isArray(row.procedures) ? row.procedures[0] : row.procedures;
    return {
      id: row.id,
      patientName: row.patient_name,
      patientPhone: row.patient_phone,
      procedureName: procedure?.name ?? "—",
      paymentStatus: row.payment_status,
      botPaused: row.bot_paused,
      createdAt: row.created_at,
    };
  });
}
