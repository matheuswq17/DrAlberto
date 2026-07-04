import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isSafeMode, normalizePhone, resolveRecipient } from "./evolution";

const ENV_KEYS = ["WHATSAPP_SAFE_MODE", "WHATSAPP_TEST_NUMBER"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  delete process.env.WHATSAPP_SAFE_MODE;
  delete process.env.WHATSAPP_TEST_NUMBER;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("normalizePhone", () => {
  it("adiciona DDI 55 quando ausente", () => {
    expect(normalizePhone("(62) 99999-1111")).toBe("5562999991111");
    expect(normalizePhone("11939011304")).toBe("5511939011304");
  });

  it("não duplica DDI 55", () => {
    expect(normalizePhone("5562999991111")).toBe("5562999991111");
  });
});

describe("safe mode (regra inviolável)", () => {
  it("é o default quando a env não está setada", () => {
    expect(isSafeMode()).toBe(true);
  });

  it("só desliga com WHATSAPP_SAFE_MODE=false explícito", () => {
    process.env.WHATSAPP_SAFE_MODE = "true";
    expect(isSafeMode()).toBe(true);
    process.env.WHATSAPP_SAFE_MODE = "false";
    expect(isSafeMode()).toBe(false);
  });

  it("redireciona qualquer número para o número de teste autorizado", () => {
    const r = resolveRecipient("(62) 98888-2222");
    expect(r.redirected).toBe(true);
    expect(r.to).toBe("5511939011304");
  });

  it("não marca como redirecionado quando já é o número de teste", () => {
    const r = resolveRecipient("11939011304");
    expect(r.redirected).toBe(false);
    expect(r.to).toBe("5511939011304");
  });

  it("com safe mode desligado envia para o número real", () => {
    process.env.WHATSAPP_SAFE_MODE = "false";
    const r = resolveRecipient("62988882222");
    expect(r.redirected).toBe(false);
    expect(r.to).toBe("5562988882222");
  });
});
