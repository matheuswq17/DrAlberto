import { describe, expect, it } from "vitest";
import { filterByPeriod, isPeriod } from "./funnel-period";
import type { Lead } from "./google/sheets";

function lead(createdAt: string): Lead {
  return {
    name: "",
    phone: "",
    motivo: "",
    examePendente: "",
    sintomas: "",
    urgencia: false,
    tipo: "",
    perguntaFaq: "",
    agendado: false,
    unidade: "",
    createdAt,
    raw: {},
  };
}

describe("isPeriod", () => {
  it("aceita só os valores válidos (7/30/90)", () => {
    expect(isPeriod("7")).toBe(true);
    expect(isPeriod("30")).toBe(true);
    expect(isPeriod("90")).toBe(true);
  });

  it("rejeita parâmetro inválido, ausente ou vazio", () => {
    expect(isPeriod("365")).toBe(false);
    expect(isPeriod("abc")).toBe(false);
    expect(isPeriod(undefined)).toBe(false);
    expect(isPeriod(null)).toBe(false);
    expect(isPeriod("")).toBe(false);
  });
});

describe("filterByPeriod", () => {
  const now = new Date("2026-07-15T12:00:00");
  const leads = [
    lead("2026-07-14 10:00"), // 1 dia atrás
    lead("2026-07-01 10:00"), // 14 dias atrás
    lead("2026-05-01 10:00"), // > 90 dias atrás
    lead(""), // sem data — nunca entra em recorte filtrado
  ];

  it("período nulo (padrão) devolve todos os leads sem filtrar", () => {
    const result = filterByPeriod(leads, null, now);
    expect(result.filtered).toHaveLength(4);
    expect(result.unrecognizedDate).toBe(0);
  });

  it("recorte de 7 dias exclui leads mais antigos e sem data", () => {
    const result = filterByPeriod(leads, "7", now);
    expect(result.filtered).toHaveLength(1);
    expect(result.unrecognizedDate).toBe(1);
  });

  it("recorte de 30 dias inclui leads dentro da janela", () => {
    const result = filterByPeriod(leads, "30", now);
    expect(result.filtered).toHaveLength(2);
  });

  it("recorte de 90 dias inclui tudo que tem data reconhecida", () => {
    const result = filterByPeriod(leads, "90", now);
    expect(result.filtered).toHaveLength(3);
    expect(result.unrecognizedDate).toBe(1);
  });

  it("lista vazia não quebra e devolve zero", () => {
    const result = filterByPeriod([], "30", now);
    expect(result.filtered).toHaveLength(0);
    expect(result.unrecognizedDate).toBe(0);
  });
});
