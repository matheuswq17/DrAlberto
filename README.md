# Site de Gestão — Dr. Alberto Rassi

Painel interno (médico + secretária) que convive com o chatbot de WhatsApp em
produção (n8n). Contexto completo em `docs/CONTEXTO_DR_ALBERTO_RASSI.md` e
especificação em `docs/SITE_DR_ALBERTO_ESPECIFICACAO.md`.

## Stack

Next.js 15 (App Router, TypeScript, Tailwind + shadcn/ui) · Supabase
(Postgres + Auth) · Google Calendar/Sheets (**somente leitura**) · Evolution
API (WhatsApp) · worker `node-cron` (mesma imagem Docker).

## Regras invioláveis (não quebrar)

1. **Nunca** notificar o Dr. Alberto por evento — só o relatório agendado.
2. **Nenhuma escrita no Google Calendar** pelo site (sem trava de
   concorrência com o bot ainda). Todo acesso Google usa escopos readonly.
3. Todo envio de WhatsApp passa por `src/lib/evolution.ts` (allowlist +
   `message_log`). Safe mode (default) redireciona tudo para `11939011304`.
4. Não mexer no workflow n8n, nem escrever no Sheets.
5. Dado de paciente sempre atrás de login (middleware + RLS).

## Setup

1. **Supabase**: criar projeto, rodar `supabase/migrations/0001_initial.sql`
   no SQL Editor. Criar os dois usuários (médico e secretária) em
   Authentication → Users e inserir os perfis:
   ```sql
   insert into profiles (id, name, role) values
     ('<uuid-do-user>', 'Dr. Alberto', 'medico'),
     ('<uuid-do-user>', 'Nome da secretária', 'secretaria');
   ```
2. **Google**: service account com acesso de leitura ao calendário e à
   planilha de leads (compartilhar ambos com o e-mail da SA).
3. `.env`: copiar `.env.example` e preencher.
4. `npm install && npm run dev` (site) e `npm run worker` (jobs).

## Comandos

| Comando | O quê |
|---|---|
| `npm run dev` / `build` / `start` | site |
| `npm run worker` | worker de cron (radar 15min, lembretes 08:00, relatório) |
| `npm run worker -- --run followups\|report\|radar` | roda um job uma vez (verificação) |
| `npm run sanity` | lê agenda + leads reais (somente leitura) e imprime |
| `npm test` | testes unitários (Vitest) |

## Deploy (Easypanel, mesma VPS do n8n)

Dois serviços apontando para a mesma imagem (este `Dockerfile`):

- **web**: comando padrão, porta 3000, com as envs de runtime + build args
  `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **worker**: mesmo build, comando `npm run worker`.

`WHATSAPP_SAFE_MODE=false` **só** depois de ok explícito do Matheus.
