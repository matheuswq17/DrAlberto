import { describe, expect, it } from "vitest";
import {
  addDays,
  hourRangeOf,
  mondayOf,
  monthGridOf,
  spDayKey,
  spWallMinutes,
  weekDaysOf,
  type AgendaEntry,
} from "./agenda";

describe("aritmética de dias (chaves YYYY-MM-DD)", () => {
  it("addDays cruza mês e ano", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("mondayOf acha a segunda da semana, inclusive no domingo", () => {
    expect(mondayOf("2026-07-08")).toBe("2026-07-06"); // quarta → segunda
    expect(mondayOf("2026-07-06")).toBe("2026-07-06"); // já é segunda
    expect(mondayOf("2026-07-12")).toBe("2026-07-06"); // domingo pertence à semana anterior
  });

  it("weekDaysOf devolve segunda→domingo", () => {
    const days = weekDaysOf("2026-07-08");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-07-06");
    expect(days[6]).toBe("2026-07-12");
  });
});

describe("fuso de São Paulo", () => {
  it("spDayKey usa o dia local de SP, não o UTC", () => {
    // 01:30 UTC = 22:30 do dia anterior em SP (UTC-3)
    expect(spDayKey("2026-07-08T01:30:00Z")).toBe("2026-07-07");
  });

  it("spWallMinutes converte para o relógio de parede de SP", () => {
    // 12:00 UTC = 09:00 SP
    expect(spWallMinutes("2026-07-08T12:00:00Z")).toBe(9 * 60);
    expect(spWallMinutes("2026-07-08T14:30:00-03:00")).toBe(14 * 60 + 30);
  });
});

describe("monthGridOf", () => {
  it("cobre o mês inteiro em linhas completas de 7", () => {
    const cells = monthGridOf("2026-07-15");
    expect(cells.length % 7).toBe(0);
    const inMonth = cells.filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].key).toBe("2026-07-01");
    expect(inMonth[30].key).toBe("2026-07-31");
  });

  it("começa na segunda-feira anterior ao dia 1º", () => {
    // 1º de julho de 2026 é quarta; a grade começa em 29/06 (segunda)
    const cells = monthGridOf("2026-07-01");
    expect(cells[0].key).toBe("2026-06-29");
    expect(cells[0].inMonth).toBe(false);
  });

  it("mês que começa na segunda não ganha linha extra antes", () => {
    // 1º de junho de 2026 é segunda-feira
    const cells = monthGridOf("2026-06-10");
    expect(cells[0].key).toBe("2026-06-01");
    expect(cells.length).toBe(35);
  });
});

describe("hourRangeOf", () => {
  const entry = (startMin: number, endMin: number): AgendaEntry => ({
    id: "x",
    dayKey: "2026-07-08",
    startMin,
    endMin,
    startLabel: "",
    endLabel: "",
    patientLabel: "",
    unit: null,
    lead: null,
  });

  it("usa 7h–19h por padrão", () => {
    expect(hourRangeOf([])).toEqual({ startHour: 7, endHour: 19 });
    expect(hourRangeOf([entry(9 * 60, 10 * 60)])).toEqual({
      startHour: 7,
      endHour: 19,
    });
  });

  it("estica para consultas fora do padrão", () => {
    expect(hourRangeOf([entry(6 * 60 + 30, 20 * 60 + 15)])).toEqual({
      startHour: 6,
      endHour: 21,
    });
  });
});
