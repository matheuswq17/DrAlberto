import { normalizePhone } from "@/lib/evolution";
import { ALL_UNITS, type UnitId } from "@/lib/units";

export interface BookingInput {
  procedureId: string;
  procedureName: string;
  patientName: string;
  patientPhone: string; // normalizado, com DDI 55
  unit: UnitId;
  startsAt: Date;
  durationMinutes: number;
  price: number;
}

export type BookingValidation =
  | { ok: true; value: BookingInput }
  | { ok: false; error: string };

export interface RawBookingInput {
  procedureId: string;
  procedureName: string;
  patientName: string;
  patientPhone: string;
  unit: string;
  startsAtIso: string;
  durationMinutes: number;
  price: number;
}

/**
 * Validação central do formulário "Marcar procedimento" — chamada tanto no
 * cliente (feedback imediato, se necessário) quanto na server action (nunca
 * confia só no cliente, mesmo padrão de schedule-conflict.ts).
 */
export function validateBookingInput(raw: RawBookingInput): BookingValidation {
  if (!raw.procedureId || !raw.procedureName) {
    return { ok: false, error: "Selecione o procedimento." };
  }
  const patientName = raw.patientName.trim();
  if (!patientName) {
    return { ok: false, error: "Informe o nome do paciente." };
  }
  const digitsOnly = raw.patientPhone.replace(/\D/g, "");
  if (digitsOnly.length < 10 || digitsOnly.length > 11) {
    return { ok: false, error: "Telefone inválido — use DDD + número." };
  }
  if (!ALL_UNITS.includes(raw.unit as UnitId)) {
    return { ok: false, error: "Selecione a unidade." };
  }
  const startsAt = new Date(raw.startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "Horário inválido." };
  }
  if (!Number.isFinite(raw.durationMinutes) || raw.durationMinutes < 10) {
    return { ok: false, error: "Duração inválida." };
  }
  if (!Number.isFinite(raw.price) || raw.price < 0) {
    return { ok: false, error: "Informe um valor válido." };
  }

  return {
    ok: true,
    value: {
      procedureId: raw.procedureId,
      procedureName: raw.procedureName,
      patientName,
      patientPhone: normalizePhone(raw.patientPhone),
      unit: raw.unit as UnitId,
      startsAt,
      durationMinutes: raw.durationMinutes,
      price: raw.price,
    },
  };
}

export function endsAtOf(startsAt: Date, durationMinutes: number): Date {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}
