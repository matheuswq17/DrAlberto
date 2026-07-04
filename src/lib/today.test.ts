import { describe, expect, it } from "vitest";
import { matchLead, normalizeName } from "./today";
import type { Lead } from "./google/sheets";

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
