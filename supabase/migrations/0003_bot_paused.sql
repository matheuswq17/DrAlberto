-- Espelho local (melhor esforço) do estado de pausa do bot por paciente. A
-- fonte de verdade real é uma chave no Redis do lado do n8n, que o painel
-- não lê diretamente hoje — esta coluna reflete só a última ação que o
-- PRÓPRIO painel tomou (marcar procedimento, pausar/retomar aqui). Pode
-- ficar dessincronizada se o bot pausar por outro motivo sem o painel saber
-- — limitação conhecida e aceita, não é bug.
alter table procedure_bookings
  add column bot_paused boolean not null default false;
