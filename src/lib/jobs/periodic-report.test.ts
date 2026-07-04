import { describe, expect, it } from "vitest";
import {
  buildReportMessage,
  countScheduledSlots,
} from "./periodic-report";
import type { ScheduleRow } from "@/lib/availability";

describe("countScheduledSlots", () => {
  const schedules: ScheduleRow[] = [
    // terças 09:00–11:00, 30min → 4 slots
    { unit: "CRD", weekday: 2, start_time: "09:00", end_time: "11:00", slot_minutes: 30 },
    // quartas 14:00–16:00, 60min → 2 slots
    { unit: "SFA", weekday: 3, start_time: "14:00", end_time: "16:00", slot_minutes: 60 },
  ];

  it("conta slots da grade dentro do período", () => {
    // seg 2026-07-06 até dom 2026-07-12 (inclui 1 terça e 1 quarta)
    const from = new Date(2026, 6, 6);
    const to = new Date(2026, 6, 13);
    expect(countScheduledSlots(schedules, from, to)).toBe(6);
  });

  it("período sem dias da grade = 0", () => {
    // quinta a sexta
    const from = new Date(2026, 6, 9);
    const to = new Date(2026, 6, 11);
    expect(countScheduledSlots(schedules, from, to)).toBe(0);
  });
});

describe("buildReportMessage", () => {
  it("monta relatório completo", () => {
    const msg = buildReportMessage({
      periodLabel: "semanal",
      totalEvents: 18,
      totalSlots: 24,
      freedNoShow: 1,
      freedCancel: 2,
      openUrgencies: 3,
      totalFaq: 10,
      faqConverted: 4,
      conversionRate: 0.4,
      notes: [],
    });
    expect(msg).toContain("18 consultas em 24 horários (75%)");
    expect(msg).toContain("2 cancelamento(s), 1 no-show(s)");
    expect(msg).toContain("Urgências abertas (sem revisão): 3");
    expect(msg).toContain("10 conversas de FAQ, 4 viraram consulta (40%)");
  });

  it("degrada com avisos quando integrações faltam", () => {
    const msg = buildReportMessage({
      periodLabel: "semanal",
      totalEvents: null,
      totalSlots: null,
      freedNoShow: 0,
      freedCancel: 0,
      openUrgencies: null,
      totalFaq: null,
      faqConverted: null,
      conversionRate: null,
      notes: ["Google Calendar indisponível — ocupação não calculada."],
    });
    expect(msg).not.toContain("Ocupação");
    expect(msg).toContain("⚠️ Google Calendar indisponível");
  });
});
