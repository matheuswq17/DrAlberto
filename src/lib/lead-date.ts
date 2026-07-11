// Parser tolerante para a coluna "Data" do Sheets (func. 6 — período do
// Funil). A coluna vem como texto formatado pela API do Sheets e mistura
// formatos observados na planilha real: ISO ("2026-07-05 08:15") e
// brasileiro ("07/07/2026, 19:53:22"). Datas que não reconhecemos voltam
// null — o chamador decide o que fazer (nunca adivinhamos uma data errada).

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/;
const BR_PATTERN =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

export function parseLeadDate(raw: string | null | undefined): Date | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const iso = value.match(ISO_PATTERN);
  if (iso) {
    const [, y, m, d, h, min, s] = iso;
    const date = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(h ?? 0),
      Number(min ?? 0),
      Number(s ?? 0)
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const br = value.match(BR_PATTERN);
  if (br) {
    const [, d, m, y, h, min, s] = br;
    const date = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(h ?? 0),
      Number(min ?? 0),
      Number(s ?? 0)
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}
