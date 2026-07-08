import { describe, expect, it } from "vitest";
import { followUpLight } from "./followup-light";

describe("followUpLight", () => {
  const today = "2026-07-08";

  it("vermelho quando o retorno é hoje ou já passou", () => {
    expect(followUpLight("2026-07-08", today)).toBe("vermelho");
    expect(followUpLight("2026-06-30", today)).toBe("vermelho");
  });

  it("amarelo até 7 dias à frente", () => {
    expect(followUpLight("2026-07-09", today)).toBe("amarelo");
    expect(followUpLight("2026-07-15", today)).toBe("amarelo");
  });

  it("verde a partir de 8 dias", () => {
    expect(followUpLight("2026-07-16", today)).toBe("verde");
    expect(followUpLight("2026-09-01", today)).toBe("verde");
  });

  it("cruza mês e ano corretamente", () => {
    expect(followUpLight("2026-08-01", "2026-07-31")).toBe("amarelo");
    expect(followUpLight("2027-01-02", "2026-12-31")).toBe("amarelo");
  });
});
