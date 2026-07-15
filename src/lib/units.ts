// Parser central de unidade a partir do título do evento no Google Calendar.
// Convenção real confirmada: prefixo no título é [CRD], [SF] ou [EINSTEIN].
// ATENÇÃO: "[SF]" (não "[SFA]") mapeia para o identificador interno 'SFA'
// usado no banco. Aceitamos "[SFA]" defensivamente, mas o padrão é "[SF]".

export type UnitId = "CRD" | "SFA" | "EINSTEIN";

export const UNIT_LABELS: Record<UnitId, string> = {
  CRD: "CRD",
  SFA: "Hospital São Francisco de Assis",
  EINSTEIN: "Hospital Albert Einstein",
};

export const ALL_UNITS: UnitId[] = ["CRD", "SFA", "EINSTEIN"];

/** Rótulo curto para espaços apertados (legenda, chips do calendário). */
export const UNIT_SHORT_LABELS: Record<UnitId, string> = {
  CRD: "CRD",
  SFA: "São Francisco",
  EINSTEIN: "Einstein",
};

/**
 * Cor FIXA por hospital, a mesma em todas as telas (tokens --unit-* no CSS).
 * Strings literais para o scanner do Tailwind; identidade, nunca estado —
 * status continua na paleta semântica (StatusBadge).
 */
export const UNIT_COLOR = {
  CRD: {
    dot: "bg-unit-crd",
    block: "border-unit-crd bg-unit-crd/15",
    text: "text-unit-crd",
  },
  SFA: {
    dot: "bg-unit-sfa",
    block: "border-unit-sfa bg-unit-sfa/15",
    text: "text-unit-sfa",
  },
  EINSTEIN: {
    dot: "bg-unit-einstein",
    block: "border-unit-einstein bg-unit-einstein/15",
    text: "text-unit-einstein",
  },
} as const satisfies Record<UnitId, { dot: string; block: string; text: string }>;

/** Estilo neutro para eventos sem prefixo de unidade no título. */
export const NO_UNIT_COLOR = {
  dot: "bg-muted-foreground/50",
  block: "border-muted-foreground/50 bg-muted",
  text: "text-muted-foreground",
} as const;

const PREFIX_PATTERNS: Array<[RegExp, UnitId]> = [
  [/^\s*\[CRD\]\s*/i, "CRD"],
  [/^\s*\[SFA?\]\s*/i, "SFA"], // [SF] oficial; [SFA] aceito defensivamente
  [/^\s*\[EINSTEIN\]\s*/i, "EINSTEIN"],
];

export function parseUnitFromTitle(title: string | null | undefined): UnitId | null {
  if (!title) return null;
  for (const [pattern, unit] of PREFIX_PATTERNS) {
    if (pattern.test(title)) return unit;
  }
  return null;
}

const FREE_TEXT_PATTERNS: Array<[RegExp, UnitId]> = [
  [/crd/i, "CRD"],
  [/s[aã]o\s*francisco|\bsfa?\b/i, "SFA"],
  [/einstein/i, "EINSTEIN"],
];

/**
 * Reconhece a unidade a partir de texto livre (ex.: campo "unidade" do
 * Sheets, digitado por alguém) — mais tolerante que parseUnitFromTitle, que
 * exige o prefixo "[XXX]" do Calendar.
 */
export function matchUnitFreeText(text: string | null | undefined): UnitId | null {
  if (!text) return null;
  for (const [pattern, unit] of FREE_TEXT_PATTERNS) {
    if (pattern.test(text)) return unit;
  }
  return null;
}

export function stripUnitPrefix(title: string | null | undefined): string {
  if (!title) return "";
  for (const [pattern] of PREFIX_PATTERNS) {
    if (pattern.test(title)) return title.replace(pattern, "").trim();
  }
  return title.trim();
}

// O bot cria eventos como "Consulta - Nome do Paciente"; para exibição e
// match com o Sheets, o que interessa é só o nome.
const CONSULTA_PREFIX = /^consulta\s*[-–—:]\s*/i;

export function extractPatientLabel(title: string | null | undefined): string {
  return stripUnitPrefix(title).replace(CONSULTA_PREFIX, "").trim();
}

/** Prefixo de título usado ao CRIAR evento (mão inversa de parseUnitFromTitle). */
export const UNIT_TITLE_PREFIX: Record<UnitId, string> = {
  CRD: "[CRD]",
  SFA: "[SF]", // convenção real é [SF], não [SFA] — ver parseUnitFromTitle acima
  EINSTEIN: "[EINSTEIN]",
};

/**
 * Título do evento para o fluxo de "Marcar procedimento" (único ponto do
 * projeto que ESCREVE no Calendar). Nome do paciente primeiro, procedimento
 * como sufixo — assim extractPatientLabel (que só remove o prefixo de
 * unidade) continua mostrando um rótulo com o nome do paciente na frente.
 */
export function buildEventTitle(
  unit: UnitId,
  patientName: string,
  procedureName: string
): string {
  return `${UNIT_TITLE_PREFIX[unit]} ${patientName} - ${procedureName}`;
}
