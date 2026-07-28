-- Espelho local (melhor esforço) do estado de pausa do bot para consultas,
-- mesmo padrão já usado em procedure_bookings (0003_bot_paused.sql) — a
-- fonte de verdade real continua sendo o Redis do n8n. Necessário agora que
-- a aba Conversas do painel passa a listar consultas junto com procedimentos.
alter table consultation_bookings
  add column bot_paused boolean not null default false;
