# Especificação do site — Dr. Alberto Rassi

Leia junto com `CONTEXTO_DR_ALBERTO_RASSI.md` (contexto completo do chatbot já existente). Este documento é o resultado de um debate multiagente (Especialista em Gestão de Consultório, Arquiteto de Software, Especialista em Produto Digital para Saúde) feito para decidir o que esse site deveria ter além de uma simples agenda.

## Objetivo do site

Ferramenta de uso diário para o Dr. Alberto e sua secretária gerenciarem os atendimentos, complementar ao chatbot de WhatsApp — não uma vitrine pública, não um projeto de marketing. Todas as features abaixo foram validadas como: (a) realmente úteis no dia a dia, (b) viáveis de construir sem grandes riscos, (c) coerentes com o que o chatbot já coleta e sabe fazer.

## Stack definida

- **Frontend/backend do site**: a construir do zero neste novo chat.
- **Agenda**: Google Calendar (mesmo calendário que o bot já usa — API do Google Calendar).
- **Mensageria**: WhatsApp via Evolution API (mesma instância que o bot já usa).
- **Banco de dados novo**: Supabase (Postgres) — ou Postgres self-hosted na mesma VPS do n8n, ver recomendação de custo no contexto geral. Vai guardar o que hoje não é persistido: histórico completo de conversas, prontuário-resumo estruturado, fila de retorno/follow-up, métricas históricas.
- **Autenticação**: login simples para médico e secretária (perfis diferentes, se fizer sentido).

## Lista de funcionalidades do MVP (todas devem estar presentes — validadas pelo usuário)

### 1. Painel "Hoje" multi-unidade com ficha de preparo do paciente
Agenda do dia consolidada das três unidades (CRD, Hospital São Francisco de Assis, Hospital Albert Einstein) em um único painel. Cada paciente do dia já vem com uma ficha-resumo estruturada (não gerada por LLM no MVP): motivo da consulta, se há exame pendente, sintomas-chave já informados ao bot, local e horário. Esses dados já existem no `leadData`/Google Sheets do fluxo do bot — a ideia é só trazer isso para uma visão organizada por dia, sem o médico precisar reler o WhatsApp.
**Complexidade: média.**

### 2. Painel de urgência silenciosa (pull, nunca push)
Lista das triagens que o bot classificou como urgentes (`urgencia_dr: true`), para o médico ou secretária abrirem e olharem quando quiserem. **Importante:** isso é só uma tela que é consultada — em hipótese alguma deve disparar notificação automática para o médico. Essa regra já existe no chatbot (nó "Notificar Dr. - Urgência" desabilitado de propósito) e deve ser respeitada também no site.
**Complexidade: média.**

### 3. Radar de no-show/cancelamento com remanejamento em 1 clique
Detecta quando um horário fica livre (cancelamento ou no-show) e sugere reenviar as opções de horário para o próximo paciente da fila de espera via WhatsApp — sempre com aprovação humana antes de confirmar (nunca 100% automático). Esta é a funcionalidade que **exige** o mecanismo de trava contra concorrência de escrita com o bot (ver bloqueio técnico #2 no contexto geral) antes de ir para produção, porque tanto o site quanto o bot podem tentar reservar o mesmo horário ao mesmo tempo.
**Complexidade: média/alta — depende do bloqueio de concorrência estar resolvido primeiro.**

### 4. Fila de retorno/follow-up automático
Pacientes que fizeram biópsia, drenagem ou outro procedimento que exige retorno em X dias entram automaticamente numa lista de acompanhamento, que dispara um lembrete via WhatsApp quando a data se aproxima.
**Complexidade: média.**

### 5. "Próximo horário disponível" ao vivo, por unidade
A mesma pergunta que o bot já responde ao paciente ("qual o próximo horário livre?"), só que visível pro médico/secretária num relance, sem precisar simular uma conversa com o próprio bot para descobrir.
**Complexidade: baixa.**

### 6. Funil de conversão (FAQ → agendamento)
Quantas conversas de FAQ viraram consulta agendada de fato, e quais perguntas mais aparecem sem virar agendamento. Ajuda o Dr. Alberto a entender a demanda e o que as pessoas mais querem saber antes de marcar.
**Complexidade: baixa.**

### 7. Relatório periódico automático via WhatsApp
Resumo semanal ou mensal (ocupação, no-show, urgências abertas, taxa de conversão) mandado automaticamente para o Dr. Alberto por WhatsApp, sem ele precisar abrir o site para isso.
**Complexidade: baixa.**

## O que foi deliberadamente cortado do MVP (e por quê)

- **Resumo de conversa por IA + "modo espelho" (replay completo do chat)**: tecnicamente bloqueado hoje, porque o histórico de WhatsApp só fica em Redis, temporário e limitado a 10 mensagens. Só vira viável depois que a transcrição completa passar a ser persistida em banco (Supabase/Postgres). Fica para uma fase 2, depois que o bloqueio técnico #1 do contexto geral for resolvido. Quando isso acontecer, a ficha-resumo do item 1 pode evoluir de estruturada/manual para gerada por IA.
- **Página pública "Consultório Inteligente" com estatísticas ao vivo**: ideia de marketing, mas os três agentes do debate concordaram em cortar do MVP por dois motivos — risco de LGPD (expor qualquer dado de atendimento publicamente) e risco de parecer "número fake" se o tráfego do site for baixo no início. Melhor tratar como projeto de marketing separado, não como parte do site de gestão do consultório.

## Pré-requisitos técnicos antes de começar a implementação

1. **Persistir a transcrição do WhatsApp de forma permanente** (hoje só existe em Redis com TTL) — em Postgres/Supabase, associada ao número/paciente. Isso destrava o item 1 (ficha por IA) e o "modo espelho" no futuro.
2. **Mecanismo de trava para escrita concorrente na agenda** entre o site e o bot — necessário antes de ativar o item 3 (remanejamento em 1 clique) em produção. Pode ser algo simples como um lock por horário/evento no Google Calendar (parecido com o lock por telefone que o bot já usa em Redis), só que compartilhado entre os dois sistemas.

## Acesso da secretária

Definido: o site é a ferramenta principal dela — visual, com agenda, ficha do paciente e aprovação de remanejamento em um clique. O WhatsApp deve ser usado só como canal complementar leve, por exemplo receber "vaga liberada às 14h, remanejar para o próximo da fila? sim/não" com botões de resposta rápida, para quando ela estiver longe do computador. Ela **não** deve digitar comandos de admin dentro do mesmo número/fluxo que atende os pacientes — isso teria que ser um número ou fluxo totalmente separado do bot de atendimento, para não haver risco de o bot confundir mensagem de admin com mensagem de paciente.
