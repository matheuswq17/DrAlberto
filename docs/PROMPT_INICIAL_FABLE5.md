Estou desenvolvendo um site de gestão de consultório para o Dr. Alberto Rassi (radiologista intervencionista em Goiânia-GO). Esse site vai ser usado todo dia pelo médico e pela secretária dele, e precisa funcionar em conjunto com um chatbot de WhatsApp que já está em produção (construído em n8n) e que hoje é a única ferramenta de atendimento. Anexei dois arquivos com todo o contexto necessário: `CONTEXTO_DR_ALBERTO_RASSI.md` (o que já existe, arquitetura do bot, regras de negócio que não podem ser quebradas) e `SITE_DR_ALBERTO_ESPECIFICACAO.md` (a lista de funcionalidades do MVP, o que foi cortado de propósito, e os dois pré-requisitos técnicos). Leia os dois inteiros antes de começar a pensar em código.

## Stack que eu quero usar

- **Next.js (React + TypeScript), full-stack**: frontend e backend (API routes/route handlers) no mesmo projeto e na mesma linguagem.
- **Supabase (Postgres)** como banco novo — para transcrição de WhatsApp, prontuário-resumo, fila de retorno e métricas.
- **Google Calendar API** (`googleapis`) — mesmo calendário que o bot já usa como fonte da verdade da agenda.
- **Evolution API** para WhatsApp — mesma instância que o bot já usa.

Escolhi TypeScript de ponta a ponta (frontend, API, jobs em background) de propósito: é a stack em que você tem melhor desempenho de primeira tentativa, o que significa menos iteração e menos custo em créditos para chegar num resultado correto, comparado a misturar Python no backend com JS no frontend. Se você achar que alguma peça específica (ex: um script de job assíncrono) se beneficiaria de outra linguagem por algum motivo concreto, me diga o motivo antes de trocar.

## Limites e cuidados

- Não toque no workflow n8n do chatbot nem no Google Calendar/Sheets que ele usa, exceto para ler. Qualquer escrita no Calendar vindo do site precisa passar primeiro pelo mecanismo de trava contra concorrência descrito na especificação — não implemente escrita direta na agenda antes de resolvermos isso comigo.
- Não superdimensione: implemente exatamente as 7 funcionalidades do MVP listadas na especificação, sem adicionar abstrações, flags de feature ou generalizações para casos hipotéticos futuros. Nada de página pública, marketing, ou "modo espelho"/replay de conversa — isso foi cortado de propósito.
- Antes de qualquer migração de schema ou decisão que seria cara de reverter depois, pare e me pergunte.
- Este é um projeto de saúde: qualquer dado de paciente (nome, telefone, sintomas, motivo de consulta) deve ficar atrás de autenticação, nunca em rota pública.

## Como quero que você comece

Antes de escrever qualquer código, monte um plano de implementação (ordem das funcionalidades, schema do banco, estrutura de pastas) e me apresente esse plano primeiro. Pode me fazer perguntas de esclarecimento se algo na especificação estiver ambíguo — prefiro responder agora do que descobrir um desalinhamento depois de horas de trabalho. Depois que eu aprovar o plano, pode seguir e construir.

Durante a construção, a cada marco importante concluído (ex: uma funcionalidade inteira, uma migração de banco), rode uma verificação própria contra a especificação antes de me avisar que terminou, e me diga o resultado real dessa verificação — se algo não funcionou ou não foi testado, diga isso claramente em vez de reportar como concluído.

Quando for me atualizar sobre o progresso, comece pelo resultado (o que funciona, o que não funciona), não pelo passo a passo de como você chegou lá.
