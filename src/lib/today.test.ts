import { describe, expect, it, vi, beforeEach } from "vitest";
import { matchLead, normalizeName } from "./today";
import type { Lead } from "./google/sheets";

vi.mock("./google/calendar", () => ({ listEvents: vi.fn() }));
vi.mock("./google/sheets", () => ({ fetchLeads: vi.fn() }));

function lead(name: string, motivo = ""): Lead {
  return {
    name,
    phone: "62999990000",
    motivo,
    examePendente: "",
    sintomas: "",
    urgencia: false,
    tipo: "agendamento",
    perguntaFaq: "",
    agendado: true,
    unidade: "",
    createdAt: "",
    raw: {},
  };
}

describe("getTodayAgenda", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64", "fake");
    vi.stubEnv("GOOGLE_CALENDAR_ID", "fake-calendar");
    vi.stubEnv("GOOGLE_SHEETS_ID", "fake-sheet");
    vi.clearAllMocks();
  });

  it("busca Calendar e Sheets em paralelo, não em sequência", async () => {
    const { listEvents } = await import("./google/calendar");
    const { fetchLeads } = await import("./google/sheets");
    const order: string[] = [];

    vi.mocked(listEvents).mockImplementation(async () => {
      order.push("calendar:start");
      await new Promise((r) => setTimeout(r, 20));
      order.push("calendar:end");
      return [];
    });
    vi.mocked(fetchLeads).mockImplementation(async () => {
      order.push("sheets:start");
      await new Promise((r) => setTimeout(r, 5));
      order.push("sheets:end");
      return [];
    });

    const { getTodayAgenda } = await import("./today");
    await getTodayAgenda();

    // se fosse sequencial, sheets:start só apareceria depois de calendar:end
    expect(order.indexOf("sheets:start")).toBeLessThan(order.indexOf("calendar:end"));
  });

  it("uma fonte falhar não impede a outra de ser usada, com aviso independente", async () => {
    const { listEvents } = await import("./google/calendar");
    const { fetchLeads } = await import("./google/sheets");

    vi.mocked(listEvents).mockRejectedValue(new Error("calendar indisponível"));
    vi.mocked(fetchLeads).mockResolvedValue([]);

    const { getTodayAgenda } = await import("./today");
    const result = await getTodayAgenda();

    expect(result.calendarOk).toBe(false);
    expect(result.sheetsOk).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].text).toContain("Google Calendar");
  });
});

describe("normalizeName", () => {
  it("remove acentos, caixa e espaços duplicados", () => {
    expect(normalizeName("  João   da SILVA ")).toBe("joao da silva");
  });
});

describe("matchLead", () => {
  const leads = [lead("Maria Souza", "antiga"), lead("João Pereira"), lead("Maria Souza", "recente")];

  it("match exato, preferindo a linha mais recente", () => {
    const m = matchLead("Maria Souza", leads);
    expect(m?.motivo).toBe("recente");
  });

  it("match por inclusão (título com sobrenome extra)", () => {
    const m = matchLead("João Pereira Filho", leads);
    expect(m?.name).toBe("João Pereira");
  });

  it("é insensível a acento e caixa", () => {
    expect(matchLead("joão pereira", leads)?.name).toBe("João Pereira");
  });

  it("sem match retorna null", () => {
    expect(matchLead("Carlos Nunes", leads)).toBeNull();
    expect(matchLead("", leads)).toBeNull();
  });
});
