import { describe, expect, it } from "vitest";
import { endsAtOf, validateBookingInput } from "./procedure-booking";

function validRaw(overrides: Partial<Parameters<typeof validateBookingInput>[0]> = {}) {
  return {
    procedureId: "11111111-1111-1111-1111-111111111111",
    procedureName: "PAAF",
    patientName: "Maria Souza",
    patientPhone: "62999998888",
    unit: "CRD",
    startsAtIso: "2026-07-18T14:00:00-03:00",
    durationMinutes: 30,
    price: 3450,
    ...overrides,
  };
}

describe("validateBookingInput", () => {
  it("aceita entrada válida e normaliza telefone com DDI 55", () => {
    const result = validateBookingInput(validRaw());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.patientPhone).toBe("5562999998888");
      expect(result.value.patientName).toBe("Maria Souza");
      expect(result.value.unit).toBe("CRD");
    }
  });

  it("rejeita sem procedimento selecionado", () => {
    const result = validateBookingInput(validRaw({ procedureId: "", procedureName: "" }));
    expect(result.ok).toBe(false);
  });

  it("rejeita nome de paciente vazio (só espaços)", () => {
    const result = validateBookingInput(validRaw({ patientName: "   " }));
    expect(result.ok).toBe(false);
  });

  it("rejeita telefone curto demais", () => {
    const result = validateBookingInput(validRaw({ patientPhone: "999" }));
    expect(result.ok).toBe(false);
  });

  it("rejeita unidade fora do enum", () => {
    const result = validateBookingInput(validRaw({ unit: "OUTRA" }));
    expect(result.ok).toBe(false);
  });

  it("rejeita horário inválido", () => {
    const result = validateBookingInput(validRaw({ startsAtIso: "não é data" }));
    expect(result.ok).toBe(false);
  });

  it("rejeita duração menor que 10 minutos", () => {
    const result = validateBookingInput(validRaw({ durationMinutes: 5 }));
    expect(result.ok).toBe(false);
  });

  it("rejeita valor negativo", () => {
    const result = validateBookingInput(validRaw({ price: -1 }));
    expect(result.ok).toBe(false);
  });
});

describe("endsAtOf", () => {
  it("soma a duração em minutos ao horário de início", () => {
    const start = new Date("2026-07-18T14:00:00-03:00");
    const end = endsAtOf(start, 30);
    expect(end.toISOString()).toBe(new Date("2026-07-18T14:30:00-03:00").toISOString());
  });
});
