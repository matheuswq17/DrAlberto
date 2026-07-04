import { describe, expect, it } from "vitest";
import { diffSnapshots, type SnapshotEvent } from "./radar";

function ev(id: string, start: string, unit: string | null = "CRD"): SnapshotEvent {
  return {
    eventId: id,
    start,
    end: new Date(new Date(start).getTime() + 30 * 60000).toISOString(),
    summary: `[CRD] Paciente ${id}`,
    unit,
  };
}

const NOW = new Date("2026-07-07T12:00:00Z");

describe("diffSnapshots", () => {
  it("detecta evento futuro que sumiu como cancelamento", () => {
    const prev = [ev("a", "2026-07-08T13:00:00Z"), ev("b", "2026-07-08T14:00:00Z")];
    const curr = [ev("b", "2026-07-08T14:00:00Z")];
    const freed = diffSnapshots(prev, curr, NOW);
    expect(freed).toHaveLength(1);
    expect(freed[0].calendar_event_id).toBe("a");
    expect(freed[0].reason).toBe("cancelamento");
  });

  it("ignora eventos que sumiram mas já passaram", () => {
    const prev = [ev("old", "2026-07-06T13:00:00Z")];
    const freed = diffSnapshots(prev, [], NOW);
    expect(freed).toHaveLength(0);
  });

  it("sem mudanças, nada detectado", () => {
    const prev = [ev("a", "2026-07-08T13:00:00Z")];
    expect(diffSnapshots(prev, prev, NOW)).toHaveLength(0);
  });

  it("evento novo não gera vaga", () => {
    const curr = [ev("novo", "2026-07-08T13:00:00Z")];
    expect(diffSnapshots([], curr, NOW)).toHaveLength(0);
  });
});
