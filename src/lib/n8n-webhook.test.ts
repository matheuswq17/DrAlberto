import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmPaymentWebhook,
  notifyProcedureBooking,
  pauseBotWebhook,
  resumeBotWebhook,
  sendManualWhatsappMessage,
  type ProcedureWebhookPayload,
} from "./n8n-webhook";

const ENV_KEYS = [
  "N8N_WEBHOOK_BASE_URL",
  "N8N_WEBHOOK_TOKEN",
  "WHATSAPP_SAFE_MODE",
  "WHATSAPP_TEST_NUMBER",
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  process.env.N8N_WEBHOOK_BASE_URL = "https://n8n.example.com/webhook";
  process.env.N8N_WEBHOOK_TOKEN = "token-secreto";
  delete process.env.WHATSAPP_SAFE_MODE; // safe mode default = true
  delete process.env.WHATSAPP_TEST_NUMBER; // usa o default 11939011304
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

const procedurePayload: ProcedureWebhookPayload = {
  telefone: "5562999998888",
  nomePaciente: "Maria Souza",
  procedimento: "PAAF",
  unidade: "CRD",
  dataHoraInicio: "2026-07-18T14:00:00-03:00",
  dataHoraFim: "2026-07-18T14:30:00-03:00",
  valor: 3450,
  eventIdCalendar: "abc123",
  idAgendamento: "11111111-1111-1111-1111-111111111111",
};

describe("configuração ausente", () => {
  it("retorna erro claro quando base URL/token não estão configurados", async () => {
    delete process.env.N8N_WEBHOOK_BASE_URL;
    delete process.env.N8N_WEBHOOK_TOKEN;
    const result = await notifyProcedureBooking(procedurePayload);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/não configurad/i);
  });
});

describe("notifyProcedureBooking", () => {
  it("chama {base}/procedimento-agendado e redireciona o telefone (safe mode)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await notifyProcedureBooking(procedurePayload);

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://n8n.example.com/webhook/procedimento-agendado");
    expect(init.headers["X-Internal-Token"]).toBe("token-secreto");
    const body = JSON.parse(init.body);
    expect(body.telefone).toBe("5511939011304"); // redirecionado — não é o telefone original
    expect(body.nomePaciente).toBe("Maria Souza");
    expect(body.idAgendamento).toBe(procedurePayload.idAgendamento);
  });

  it("com safe mode desligado, envia o telefone real", async () => {
    process.env.WHATSAPP_SAFE_MODE = "false";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await notifyProcedureBooking(procedurePayload);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.telefone).toBe("5562999998888");
  });
});

describe("sendManualWhatsappMessage", () => {
  it("chama {base}/whatsapp-enviar e prefixa a mensagem quando redirecionada", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendManualWhatsappMessage({
      telefone: "5562999998888",
      mensagem: "Olá, tudo bem?",
      enviadoPor: "profile-1",
    });

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://n8n.example.com/webhook/whatsapp-enviar");
    const body = JSON.parse(init.body);
    expect(body.telefone).toBe("5511939011304");
    expect(body.mensagem).toMatch(/^\[TESTE — destinatário original: 5562999998888\]/);
    expect(body.mensagem).toMatch(/Olá, tudo bem\?$/);
    expect(body.enviadoPor).toBe("profile-1");
  });

  it("não prefixa a mensagem quando o telefone já é o de teste", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await sendManualWhatsappMessage({
      telefone: "11939011304",
      mensagem: "Olá",
      enviadoPor: "profile-1",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.mensagem).toBe("Olá");
  });
});

describe("confirmPaymentWebhook / pauseBotWebhook / resumeBotWebhook", () => {
  it("chamam os paths corretos com telefone redirecionado", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await confirmPaymentWebhook({
      idAgendamento: "id-1",
      telefone: "5562999998888",
      confirmadoPor: "profile-1",
    });
    await pauseBotWebhook({
      telefone: "5562999998888",
      motivo: "manual",
      pausadoPor: "profile-1",
    });
    await resumeBotWebhook({ telefone: "5562999998888", retomadoPor: "profile-1" });

    expect(fetchMock.mock.calls[0][0]).toBe("https://n8n.example.com/webhook/confirmar-pagamento");
    expect(fetchMock.mock.calls[1][0]).toBe("https://n8n.example.com/webhook/pausar-bot");
    expect(fetchMock.mock.calls[2][0]).toBe("https://n8n.example.com/webhook/retomar-bot");
    for (const call of fetchMock.mock.calls) {
      expect(JSON.parse(call[1].body).telefone).toBe("5511939011304");
    }
  });
});

describe("erros de transporte", () => {
  it("retorna erro quando o webhook responde status != 2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("erro interno") })
    );
    const result = await notifyProcedureBooking(procedurePayload);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/500/);
  });

  it("retorna erro quando o fetch lança (falha de rede)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const result = await notifyProcedureBooking(procedurePayload);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ECONNREFUSED/);
  });

  it("retorna erro de timeout quando o fetch aborta", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));
    const result = await notifyProcedureBooking(procedurePayload);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/timeout/i);
  });
});
