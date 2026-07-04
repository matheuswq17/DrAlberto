import { describe, expect, it } from "vitest";
import {
  offerMessage,
  pickCandidate,
  type FreedSlotRow,
  type SuggestionRow,
  type WaitingRow,
} from "./reschedule";

const SLOT: FreedSlotRow = {
  id: "slot1",
  calendar_event_id: "ev1",
  unit: "CRD",
  starts_at: "2026-07-10T14:00:00-03:00",
  ends_at: "2026-07-10T14:30:00-03:00",
  reason: "cancelamento",
  status: "aberta",
};

function waiting(
  id: string,
  createdAt: string,
  preferred: string | null = null,
  status = "aguardando"
): WaitingRow {
  return {
    id,
    patient_name: `Paciente ${id}`,
    phone: "62999990000",
    preferred_unit: preferred,
    notes: null,
    status,
    created_at: createdAt,
  };
}

function sugg(slotId: string, waitingId: string, status: string): SuggestionRow {
  return {
    id: `${slotId}-${waitingId}`,
    freed_slot_id: slotId,
    waiting_list_id: waitingId,
    status,
    sent_at: null,
    created_at: "2026-07-01T00:00:00Z",
  };
}

describe("pickCandidate", () => {
  it("FIFO quando ninguém tem preferência", () => {
    const w = [waiting("b", "2026-07-02"), waiting("a", "2026-07-01")];
    expect(pickCandidate(SLOT, w, [])?.id).toBe("a");
  });

  it("preferência pela unidade da vaga vence a ordem de chegada", () => {
    const w = [waiting("a", "2026-07-01"), waiting("b", "2026-07-02", "CRD")];
    expect(pickCandidate(SLOT, w, [])?.id).toBe("b");
  });

  it("pula quem já foi sugerido (enviado ou rejeitado) para a mesma vaga", () => {
    const w = [waiting("a", "2026-07-01"), waiting("b", "2026-07-02")];
    const s = [sugg("slot1", "a", "rejeitada")];
    expect(pickCandidate(SLOT, w, s)?.id).toBe("b");
  });

  it("ignora status diferente de aguardando", () => {
    const w = [
      waiting("a", "2026-07-01", null, "contactado"),
      waiting("b", "2026-07-02", null, "removido"),
    ];
    expect(pickCandidate(SLOT, w, [])).toBeNull();
  });
});

describe("offerMessage", () => {
  it("inclui nome, horário formatado e unidade", () => {
    const msg = offerMessage("Maria", SLOT, "CRD");
    expect(msg).toContain("Maria");
    expect(msg).toContain("CRD");
    expect(msg).toMatch(/14:00/);
  });
});
