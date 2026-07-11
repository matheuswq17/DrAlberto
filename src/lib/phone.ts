// Máscara de telefone para exibição por padrão — preserva só os últimos 4
// dígitos, suficientes para identificação, sem expor o número completo em
// cards e tabelas gerais.

export function maskPhone(phone: string | null | undefined): string {
  const raw = (phone ?? "").trim();
  if (!raw) return "—";

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  const last4 = digits.slice(-4);

  if (digits.length === 11) {
    // DDD (2) + 9 + 8 dígitos — celular brasileiro
    const ddd = digits.slice(0, 2);
    const firstDigit = digits.slice(2, 3);
    return `(${ddd}) ${firstDigit}••••-${last4}`;
  }
  if (digits.length === 10) {
    // DDD (2) + 8 dígitos — fixo
    const ddd = digits.slice(0, 2);
    return `(${ddd}) ••••-${last4}`;
  }
  if (digits.length === 13 && digits.startsWith("55")) {
    // +55 DDD 9XXXXXXXX
    const ddd = digits.slice(2, 4);
    const firstDigit = digits.slice(4, 5);
    return `(${ddd}) ${firstDigit}••••-${last4}`;
  }
  return `••••${last4}`;
}
