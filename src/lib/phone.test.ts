import { describe, expect, it } from "vitest";
import { maskPhone } from "./phone";

describe("maskPhone", () => {
  it("mascara celular de 11 dígitos preservando DDD e os últimos 4", () => {
    expect(maskPhone("62999991111")).toBe("(62) 9••••-1111");
  });

  it("aceita telefone já formatado com pontuação", () => {
    expect(maskPhone("(62) 99999-1111")).toBe("(62) 9••••-1111");
  });

  it("mascara fixo de 10 dígitos", () => {
    expect(maskPhone("6233221111")).toBe("(62) ••••-1111");
  });

  it("remove o prefixo internacional +55", () => {
    expect(maskPhone("5562999991111")).toBe("(62) 9••••-1111");
  });

  it("usa fallback genérico para tamanhos inesperados", () => {
    expect(maskPhone("12345")).toBe("••••2345");
  });

  it("devolve travessão para telefone ausente", () => {
    expect(maskPhone(null)).toBe("—");
    expect(maskPhone(undefined)).toBe("—");
    expect(maskPhone("")).toBe("—");
    expect(maskPhone("   ")).toBe("—");
  });

  it("nunca inclui o número completo na saída", () => {
    const masked = maskPhone("62999991111");
    expect(masked).not.toContain("99999");
  });
});
