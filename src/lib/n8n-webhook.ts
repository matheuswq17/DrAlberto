// Notifica o bot n8n quando o médico marca um procedimento pelo painel — o
// bot é quem manda a mensagem de confirmação ao paciente. Contrato ainda em
// stub do lado do n8n (URL/token chegam depois); falha aqui NUNCA desfaz o
// agendamento já gravado (evita duplo-agendamento por retry às cegas) — só
// reporta o erro para a interface avisar o médico a notificar manualmente.

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

export interface WebhookResult {
  ok: boolean;
  error?: string;
}

export async function notifyProcedureBooking(
  payload: ProcedureWebhookPayload
): Promise<WebhookResult> {
  const url = process.env.N8N_PROCEDURE_WEBHOOK_URL;
  const token = process.env.N8N_PROCEDURE_WEBHOOK_TOKEN;
  if (!url || !token) {
    return {
      ok: false,
      error:
        "N8N_PROCEDURE_WEBHOOK_URL/TOKEN não configurados — o bot ainda não foi avisado.",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Token": token },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Webhook do bot respondeu ${res.status}: ${text.slice(0, 300)}`,
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: `Falha de rede ao chamar webhook do bot: ${String(err)}`,
    };
  }

  return { ok: true };
}
