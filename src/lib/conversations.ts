import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConversationBooking {
  id: string;
  kind: "procedimento" | "consulta";
  patientName: string;
  patientPhone: string;
  serviceLabel: string;
  paymentStatus: "pendente" | "confirmado";
  botPaused: boolean;
  createdAt: string;
  // Só preenchido para kind==="consulta" com convênio integral (tipo_plano==="integral")
  // — nesse caso a consulta não passa por pagamento Pix, e sim por confirmação do
  // financeiro sobre a cobertura do convênio (ver 0007_consultation_bookings_convenio.sql).
  tipoPlano: string | null;
  convenioStatus: "pendente" | "confirmado" | null;
  carteirinhaNumero: string | null;
}

export interface MessageRow {
  id: string;
  phone: string;
  direction: "inbound" | "outbound";
  content: string;
  message_ts: string;
}

interface ProcedureBookingRow {
  id: string;
  patient_name: string;
  patient_phone: string;
  payment_status: "pendente" | "confirmado";
  bot_paused: boolean;
  created_at: string;
  procedures: { name: string } | { name: string }[] | null;
}

interface ConsultationBookingRow {
  id: string;
  patient_name: string | null;
  patient_phone: string;
  local: string | null;
  payment_status: "pendente" | "confirmado";
  bot_paused: boolean;
  created_at: string;
  tipo_plano: string | null;
  convenio_status: "pendente" | "confirmado" | null;
  carteirinha_numero: string | null;
}

const LOCAL_LABELS: Record<string, string> = {
  CRD: "CRD",
  "Sao Francisco": "Hospital São Francisco de Assis",
  Einstein: "Hospital Albert Einstein",
  Teleconsulta: "Teleconsulta",
};

/**
 * Pacientes com procedimento OU consulta marcados, mais recentes primeiro —
 * fonte da lista da aba Conversas. Unifica as duas origens (procedure_bookings
 * e consultation_bookings) numa lista só, discriminada por `kind`.
 */
export async function getConversationBookings(
  supabase: SupabaseClient
): Promise<ConversationBooking[]> {
  const [proceduresResult, consultationsResult] = await Promise.all([
    supabase
      .from("procedure_bookings")
      .select("id, patient_name, patient_phone, payment_status, bot_paused, created_at, procedures(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("consultation_bookings")
      .select(
        "id, patient_name, patient_phone, local, payment_status, bot_paused, created_at, tipo_plano, convenio_status, carteirinha_numero"
      )
      .order("created_at", { ascending: false }),
  ]);

  if (proceduresResult.error) throw new Error(proceduresResult.error.message);
  if (consultationsResult.error) throw new Error(consultationsResult.error.message);

  const procedureBookings: ConversationBooking[] = (
    (proceduresResult.data ?? []) as unknown as ProcedureBookingRow[]
  ).map((row) => {
    // supabase-js pode devolver o relacionamento como objeto único ou como
    // array de 1 elemento dependendo de como infere a cardinalidade — trata
    // os dois formatos defensivamente.
    const procedure = Array.isArray(row.procedures) ? row.procedures[0] : row.procedures;
    return {
      id: row.id,
      kind: "procedimento" as const,
      patientName: row.patient_name,
      patientPhone: row.patient_phone,
      serviceLabel: procedure?.name ?? "—",
      paymentStatus: row.payment_status,
      botPaused: row.bot_paused,
      createdAt: row.created_at,
      tipoPlano: null,
      convenioStatus: null,
      carteirinhaNumero: null,
    };
  });

  const consultationBookings: ConversationBooking[] = (
    (consultationsResult.data ?? []) as unknown as ConsultationBookingRow[]
  ).map((row) => ({
    id: row.id,
    kind: "consulta" as const,
    patientName: row.patient_name ?? "—",
    patientPhone: row.patient_phone,
    serviceLabel: "Consulta — " + (row.local ? (LOCAL_LABELS[row.local] ?? row.local) : "—"),
    paymentStatus: row.payment_status,
    botPaused: row.bot_paused,
    createdAt: row.created_at,
    tipoPlano: row.tipo_plano,
    convenioStatus: row.convenio_status,
    carteirinhaNumero: row.carteirinha_numero,
  }));

  return [...procedureBookings, ...consultationBookings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
