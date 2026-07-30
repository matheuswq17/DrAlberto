-- Suporte a convênio integral em consultation_bookings (pedido explícito do médico,
-- decidido via /debate): quando o convênio do paciente cobre a consulta
-- (tipo_plano='integral'), a reserva não passa pelo fluxo de pagamento via Pix — em vez
-- disso o secretário do financeiro confirma a cobertura do convênio (usando a
-- carteirinha, quando informada) pelo botão "Confirmar convênio" no painel. Nesse caso
-- payment_status já nasce 'confirmado' (não há Pix a cobrar) e convenio_status nasce
-- 'pendente' até a confirmação manual.
alter table consultation_bookings
  add column tipo_plano text,
  add column carteirinha_numero text,
  add column convenio_status text check (convenio_status in ('pendente', 'confirmado'));
