import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyProcedureBooking, type ProcedureWebhookPayload } from "./n8n-webhook";

const ENV_KEYS = ["N8N_PROCEDURE_WEBHOOK_URL", "N8N_PROCEDURE_WEBHOOK_TOKEN"] as const;
let saved: Record<string, string | undefined>;

const payload: ProcedureWebhookPayload = {
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

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

describe("notifyProcedureBooking", () => {
  it("retorna erro claro quando as envs não estão configuradas (stub atual)", async () => {
    delete process.env.N8N_PROCEDURE_WEBHOOK_URL;
    delete process.env.N8N_PROCEDURE_WEBHOOK_TOKEN;
    const result = await notifyProcedureBooking(payload);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/não configurad/i);
  });

  it("retorna ok quando o webhook responde 200", async () => {
    process.env.N8N_PROCEDURE_WEBHOOK_URL = "https://n8n.example.com/webhook/procedimento";
    process.env.N8N_PROCEDURE_WEBHOOK_TOKEN = "token-secreto";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await notifyProcedureBooking(payload);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://n8n.example.com/webhook/procedimento",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Internal-Token": "token-secreto" }),
        body: JSON.stringify(payload),
      })
    );
  });

  it("retorna erro quando o webhook responde status != 2xx", async () => {
    process.env.N8N_PROCEDURE_WEBHOOK_URL = "https://n8n.example.com/webhook/procedimento";
    process.env.N8N_PROCEDURE_WEBHOOK_TOKEN = "token-secreto";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("erro interno"),
      })
    );
    const result = await notifyProcedureBooking(payload);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/500/);
  });

  it("retorna erro quando o fetch lança (falha de rede)", async () => {
    process.env.N8N_PROCEDURE_WEBHOOK_URL = "https://n8n.example.com/webhook/procedimento";
    process.env.N8N_PROCEDURE_WEBHOOK_TOKEN = "token-secreto";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const result = await notifyProcedureBooking(payload);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ECONNREFUSED/);
  });
});
