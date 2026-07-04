import { describe, expect, it } from "vitest";
import { nextFreeSlot, type BusyInterval, type ScheduleRow } from "./availability";

// Terça-feira, 2026-07-07, 08:00 local
const FROM = new Date(2026, 6, 7, 8, 0, 0);

const SCHEDULES: ScheduleRow[] = [
  // CRD: terças 09:00–11:00, slots de 30min
  { unit: "CRD", weekday: 2, start_time: "09:00", end_time: "11:00", slot_minutes: 30 },
  // SFA: quartas 14:00–16:00, slots de 60min
  { unit: "SFA", weekday: 3, start_time: "14:00", end_time: "16:00", slot_minutes: 60 },
];

describe("nextFreeSlot", () => {
  it("retorna o primeiro slot da grade quando a agenda está vazia", () => {
    const slot = nextFreeSlot("CRD", SCHEDULES, [], FROM);
    expect(slot?.start).toEqual(new Date(2026, 6, 7, 9, 0));
    expect(slot?.end).toEqual(new Date(2026, 6, 7, 9, 30));
  });

  it("pula slots ocupados por eventos — de qualquer unidade", () => {
    const busy: BusyInterval[] = [
      // evento (de outra unidade) ocupando 09:00–09:30: médico é um só
      { start: new Date(2026, 6, 7, 9, 0), end: new Date(2026, 6, 7, 9, 30) },
    ];
    const slot = nextFreeSlot("CRD", SCHEDULES, busy, FROM);
    expect(slot?.start).toEqual(new Date(2026, 6, 7, 9, 30));
  });

  it("vai para o próximo dia da grade quando o dia está lotado", () => {
    const busy: BusyInterval[] = [
      { start: new Date(2026, 6, 7, 9, 0), end: new Date(2026, 6, 7, 11, 0) },
    ];
    const slot = nextFreeSlot("CRD", SCHEDULES, busy, FROM);
    // próxima terça
    expect(slot?.start).toEqual(new Date(2026, 6, 14, 9, 0));
  });

  it("não oferece slot no passado", () => {
    const lateFrom = new Date(2026, 6, 7, 10, 45);
    const slot = nextFreeSlot("CRD", SCHEDULES, [], lateFrom);
    // 10:30 já começou; o único que começa depois de 10:45 seria 11:00, fora da janela
    expect(slot?.start).toEqual(new Date(2026, 6, 14, 9, 0));
  });

  it("respeita a duração do slot da unidade", () => {
    const slot = nextFreeSlot("SFA", SCHEDULES, [], FROM);
    expect(slot?.start).toEqual(new Date(2026, 6, 8, 14, 0));
    expect(slot?.end).toEqual(new Date(2026, 6, 8, 15, 0));
  });

  it("retorna null para unidade sem grade", () => {
    expect(nextFreeSlot("EINSTEIN", SCHEDULES, [], FROM)).toBeNull();
  });
});
