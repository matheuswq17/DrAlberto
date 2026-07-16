-- Cancelamento de procedimento marcado pelo painel. Soft delete via
-- canceled_at (não hard-delete) para preservar o histórico — a Agenda passa
-- a ocultar da grade qualquer procedure_booking cancelado, mas a aba
-- Conversas continua mostrando o paciente normalmente.
alter table procedure_bookings
  add column canceled_at timestamptz;
