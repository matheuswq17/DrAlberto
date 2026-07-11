import { describe, expect, it } from "vitest";
import { parseLeadDate } from "./lead-date";

describe("parseLeadDate", () => {
  it("reconhece formato ISO com hora", () => {
    const d = parseLeadDate("2026-07-05 08:15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(6); // julho = índice 6
    expect(d!.getDate()).toBe(5);
    expect(d!.getHours()).toBe(8);
    expect(d!.getMinutes()).toBe(15);
  });

  it("reconhece formato ISO sem hora", () => {
    const d = parseLeadDate("2026-07-05");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(6);
    expect(d!.getDate()).toBe(5);
  });

  it("reconhece formato brasileiro DD/MM/AAAA com hora e vírgula", () => {
    const d = parseLeadDate("07/07/2026, 19:53:22");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(6);
    expect(d!.getDate()).toBe(7);
    expect(d!.getHours()).toBe(19);
    expect(d!.getMinutes()).toBe(53);
  });

  it("reconhece formato brasileiro DD/MM/AAAA sem hora", () => {
    const d = parseLeadDate("05/07/2026");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(6);
    expect(d!.getDate()).toBe(5);
  });

  it("interpreta DD/MM (não MM/DD) — dia 25 só existe se for o primeiro grupo", () => {
    const d = parseLeadDate("25/12/2026");
    expect(d!.getMonth()).toBe(11); // dezembro
    expect(d!.getDate()).toBe(25);
  });

  it("devolve null para texto vazio, ausente ou não reconhecido", () => {
    expect(parseLeadDate("")).toBeNull();
    expect(parseLeadDate(null)).toBeNull();
    expect(parseLeadDate(undefined)).toBeNull();
    expect(parseLeadDate("não é uma data")).toBeNull();
  });
});
