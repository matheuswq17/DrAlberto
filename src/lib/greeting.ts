// Saudação da Visão geral — normaliza o nome do perfil para não duplicar
// título (ex.: "Dr. Dr.") quando o nome cadastrado já vem com "Dr."/"Dra.".

const TITLE_PATTERN = /^(dra|doutora|dr|doutor)\.?\s+/i;

function normalizeTitle(token: string): "Dr." | "Dra." {
  const lower = token.toLowerCase();
  return lower.startsWith("dra") || lower.startsWith("doutora") ? "Dra." : "Dr.";
}

/**
 * Extrai o primeiro nome e o título correto (sem duplicar) a partir do nome
 * cadastrado no perfil. Se o nome já tiver título ("Dr.", "Dra.", "Doutor",
 * "Doutora"), esse título é preservado; senão, "Dr." só é aplicado quando
 * `role` for "medico". Nome ausente devolve string vazia.
 */
export function formatGreetingName(
  name: string | null | undefined,
  role: string | null | undefined
): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "";

  const match = trimmed.match(TITLE_PATTERN);
  const title = match ? normalizeTitle(match[1]) : null;
  const rest = match ? trimmed.slice(match[0].length) : trimmed;

  const rawFirstName = rest.trim().split(/\s+/)[0] ?? "";
  if (!rawFirstName) return "";
  const firstName =
    rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase();

  const effectiveTitle = title ?? (role === "medico" ? "Dr." : null);
  return effectiveTitle ? `${effectiveTitle} ${firstName}` : firstName;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Saudação completa ("Boa tarde, Dr. Alberto" ou só "Boa tarde" sem nome). */
export function buildGreeting(
  hour: number,
  name: string | null | undefined,
  role: string | null | undefined
): string {
  const namePart = formatGreetingName(name, role);
  const base = greetingForHour(hour);
  return namePart ? `${base}, ${namePart}` : base;
}
