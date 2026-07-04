import { describe, expect, it } from "vitest";
import { computeFunnel } from "./metrics";
import type { Lead } from "./google/sheets";

function lead(partial: Partial<Lead>): Lead {
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
    createdAt: "",
    raw: {},
    ...partial,
  };
}

describe("computeFunnel", () => {
  const leads: Lead[] = [
    // FAQ que virou agendamento na mesma linha
    lead({ phone: "1", tipo: "faq", perguntaFaq: "Quanto custa?", agendado: true }),
    // FAQ cujo telefone agendou em outra linha
    lead({ phone: "2", tipo: "faq", perguntaFaq: "Aceita convênio?" }),
    lead({ phone: "2", tipo: "agendamento", agendado: true }),
    // FAQ sem conversão (duas vezes a mesma pergunta)
    lead({ phone: "3", tipo: "faq", perguntaFaq: "Quanto custa?" }),
    lead({ phone: "4", tipo: "faq", perguntaFaq: "Onde fica?" }),
    // agendamento direto, não conta como FAQ
    lead({ phone: "5", tipo: "agendamento", agendado: true }),
  ];

  it("conta FAQ e conversões (mesma linha ou mesmo telefone)", () => {
    const m = computeFunnel(leads);
    expect(m.totalFaq).toBe(4);
    expect(m.faqConverted).toBe(2);
    expect(m.conversionRate).toBeCloseTo(0.5);
  });

  it("agrega perguntas por texto normalizado", () => {
    const m = computeFunnel(leads);
    const custa = m.topQuestions.find((q) => q.question === "Quanto custa?");
    expect(custa?.count).toBe(2);
    expect(custa?.converted).toBe(1);
  });

  it("lista perguntas que nunca converteram", () => {
    const m = computeFunnel(leads);
    expect(m.topUnconverted.map((q) => q.question)).toEqual(["Onde fica?"]);
  });

  it("taxa 0 sem FAQs", () => {
    expect(computeFunnel([]).conversionRate).toBe(0);
  });
});
