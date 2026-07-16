// Chamadas ao n8n — único ponto de integração do painel com o bot de
// WhatsApp externo. Todo telefone passa por safePhone() (mesma regra de
// safe mode de src/lib/evolution.ts) antes de sair do painel: em safe mode
// (default), o número enviado ao n8n é sempre o de teste, nunca o do
// paciente real — mesmo que o envio de fato aconteça do lado do n8n, não
// por evolution.ts. Falha aqui NUNCA desfaz uma ação já persistida no
// painel (evita duplo-agendamento/duplo-envio por retry às cegas) — só
// reporta o erro para a interface avisar quem estiver usando.

import { normalizePhone, resolveRecipient } from "@/lib/evolution";

export interface WebhookResult {
  ok: boolean;
  error?: string;
}

const TIMEOUT_MS = 8000;

async function callWebhook(
  path: string,
  payload: Record<string, unknown>
): Promise<WebhookResult> {
  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL;
  const token = process.env.N8N_WEBHOOK_TOKEN;
  if (!baseUrl || !token) {
    return {
      ok: false,
      error: `N8N_WEBHOOK_BASE_URL/N8N_WEBHOOK_TOKEN não configurados — não foi possível chamar ${path}.`,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Token": token },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `Webhook ${path} respondeu ${res.status}: ${text.slice(0, 300)}` };
    }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: timedOut
        ? `Timeout ao chamar webhook ${path} (${TIMEOUT_MS / 1000}s).`
        : `Falha de rede ao chamar webhook ${path}: ${String(err)}`,
    };
  } finally {
    clearTimeout(timeout);
  }

  return { ok: true };
}

/** Aplica o safe mode (mesma regra de evolution.ts) a um telefone antes de incluí-lo num payload de webhook. */
function safePhone(phone: string): { phone: string; redirected: boolean } {
  const { to, redirected } = resolveRecipient(phone);
  return { phone: to, redirected };
}

export interface ProcedureWebhookPayload {
  telefone: string;
  nomePaciente: string;
  procedimento: string;
  unidade: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  valor: number;
  eventIdCalendar: string;
  idAgendamento: string;
}

export async function notifyProcedureBooking(
  payload: ProcedureWebhookPayload
): Promise<WebhookResult> {
  const { phone } = safePhone(payload.telefone);
  return callWebhook("procedimento-agendado", { ...payload, telefone: phone });
}

export interface ManualMessagePayload {
  telefone: string;
  mensagem: string;
  enviadoPor: string;
}

export async function sendManualWhatsappMessage(
  payload: ManualMessagePayload
): Promise<WebhookResult> {
  const { phone, redirected } = safePhone(payload.telefone);
  const mensagem = redirected
    ? `[TESTE — destinatário original: ${normalizePhone(payload.telefone)}]\n\n${payload.mensagem}`
    : payload.mensagem;
  return callWebhook("whatsapp-enviar", { telefone: phone, mensagem, enviadoPor: payload.enviadoPor });
}

export interface ConfirmPaymentPayload {
  idAgendamento: string;
  telefone: string;
  confirmadoPor: string;
}

export async function confirmPaymentWebhook(
  payload: ConfirmPaymentPayload
): Promise<WebhookResult> {
  const { phone } = safePhone(payload.telefone);
  return callWebhook("confirmar-pagamento", { ...payload, telefone: phone });
}

export interface PauseBotPayload {
  telefone: string;
  motivo: string;
  pausadoPor: string;
}

export async function pauseBotWebhook(payload: PauseBotPayload): Promise<WebhookResult> {
  const { phone } = safePhone(payload.telefone);
  return callWebhook("pausar-bot", { ...payload, telefone: phone });
}

export interface ResumeBotPayload {
  telefone: string;
  retomadoPor: string;
}

export async function resumeBotWebhook(payload: ResumeBotPayload): Promise<WebhookResult> {
  const { phone } = safePhone(payload.telefone);
  return callWebhook("retomar-bot", { ...payload, telefone: phone });
}
