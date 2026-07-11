import { describe, expect, it } from "vitest";
import {
  findScheduleConflict,
  isValidTimeRange,
  type ScheduleRowLike,
} from "./schedule-conflict";

function row(
  id: string,
  unit: string,
  weekday: number,
  start: string,
  end: string
): ScheduleRowLike {
  return { id, unit, weekday, start_time: start, end_time: end };
}

describe("isValidTimeRange", () => {
  it("aceita início antes do fim", () => {
    expect(isValidTimeRange("08:00", "12:00")).toBe(true);
  });

  it("rejeita início igual ou depois do fim", () => {
    expect(isValidTimeRange("12:00", "12:00")).toBe(false);
    expect(isValidTimeRange("13:00", "12:00")).toBe(false);
  });
});

describe("findScheduleConflict", () => {
  const existing = [
    row("1", "CRD", 1, "08:00", "12:00"),
    row("2", "CRD", 3, "08:00", "12:00"),
    row("3", "SFA", 1, "08:00", "12:00"),
  ];

  it("detecta sobreposição parcial na mesma unidade e dia", () => {
    const conflict = findScheduleConflict(
      { unit: "CRD", weekday: 1, start_time: "10:00", end_time: "14:00" },
      existing
    );
    expect(conflict?.id).toBe("1");
  });

  it("detecta quando o novo intervalo contém o existente", () => {
    const conflict = findScheduleConflict(
      { unit: "CRD", weekday: 1, start_time: "07:00", end_time: "13:00" },
      existing
    );
    expect(conflict?.id).toBe("1");
  });

  it("não conflita quando os intervalos só se tocam na borda", () => {
    const conflict = findScheduleConflict(
      { unit: "CRD", weekday: 1, start_time: "12:00", end_time: "14:00" },
      existing
    );
    expect(conflict).toBeNull();
  });

  it("não conflita em unidade diferente, mesmo dia e horário", () => {
    const conflict = findScheduleConflict(
      { unit: "EINSTEIN", weekday: 1, start_time: "08:00", end_time: "12:00" },
      existing
    );
    expect(conflict).toBeNull();
  });

  it("não conflita em dia diferente, mesma unidade e horário", () => {
    const conflict = findScheduleConflict(
      { unit: "CRD", weekday: 2, start_time: "08:00", end_time: "12:00" },
      existing
    );
    expect(conflict).toBeNull();
  });

  it("ignora a própria linha quando excludeId é passado", () => {
    const conflict = findScheduleConflict(
      { unit: "CRD", weekday: 1, start_time: "08:00", end_time: "12:00" },
      existing,
      "1"
    );
    expect(conflict).toBeNull();
  });

  it("lista vazia nunca conflita", () => {
    expect(
      findScheduleConflict(
        { unit: "CRD", weekday: 1, start_time: "08:00", end_time: "12:00" },
        []
      )
    ).toBeNull();
  });
});
