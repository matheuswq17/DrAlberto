import { createAdminClient } from "@/lib/supabase/admin";

// ÚNICO ponto de envio de WhatsApp de todo o projeto (regra inviolável).
// - Safe mode (default): TODO envio é redirecionado para um dos números de
//   teste autorizados (WHATSAPP_TEST_NUMBER, lista separada por vírgula).
//   Só desligar com WHATSAPP_SAFE_MODE=false em produção, após ok explícito
//   do Matheus.
// - Todo envio bem-sucedido é registrado em message_log.

export type MessageKind =
  | "lembrete_retorno"
  | "oferta_remanejamento"
  | "relatorio_periodico";

const DEFAULT_TEST_NUMBER = "11939011304";

export function isSafeMode(): boolean {
  return process.env.WHATSAPP_SAFE_MODE !== "false";
}

/** Normaliza para dígitos com DDI 55 (formato que a Evolution API espera). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

/** Lista de números de teste autorizados (o primeiro é o destino padrão do redirecionamento). */
function testNumbers(): string[] {
  const raw = process.env.WHATSAPP_TEST_NUMBER ?? DEFAULT_TEST_NUMBER;
  return raw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .map(normalizePhone);
}

/** Decide o destinatário real, aplicando a allowlist do safe mode. */
export function resolveRecipient(phone: string): {
  to: string;
  redirected: boolean;
} {
  const allowed = testNumbers();
  const normalized = normalizePhone(phone);
  if (isSafeMode() && !allowed.includes(normalized)) {
    return { to: allowed[0], redirected: true };
  }
  return { to: normalized, redirected: false };
}

export interface SendResult {
  ok: boolean;
  redirected: boolean;
  error?: string;
}

export async function sendWhatsAppMessage(params: {
  phone: string;
  body: string;
  kind: MessageKind;
  relatedId?: string;
  sentBy?: string; // profile id quando disparado por ação humana; ausente no worker
}): Promise<SendResult> {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;
  if (!baseUrl || !apiKey || !instance) {
    return {
      ok: false,
      redirected: false,
      error: "Evolution API não configurada (EVOLUTION_API_URL/KEY/INSTANCE)",
    };
  }

  const { to, redirected } = resolveRecipient(params.phone);
  const safeMode = isSafeMode();
  const body = redirected
    ? `[TESTE — destinatário original: ${normalizePhone(params.phone)}]\n\n${params.body}`
    : params.body;

  try {
    const res = await fetch(
      `${baseUrl.replace(/\/$/, "")}/message/sendText/${instance}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ number: to, text: body }),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        redirected,
        error: `Evolution API respondeu ${res.status}: ${text.slice(0, 300)}`,
      };
    }
  } catch (err) {
    return {
      ok: false,
      redirected,
      error: `Falha de rede ao chamar Evolution API: ${String(err)}`,
    };
  }

  const supabase = createAdminClient();
  const { error: logError } = await supabase.from("message_log").insert({
    phone: to,
    kind: params.kind,
    body,
    safe_mode: safeMode,
    related_id: params.relatedId ?? null,
    sent_by: params.sentBy ?? null,
  });
  if (logError) {
    // Envio aconteceu; falha de log não deve mascarar o sucesso, mas precisa
    // aparecer nos logs do servidor.
    console.error("message_log insert falhou:", logError.message);
  }

  return { ok: true, redirected };
}
