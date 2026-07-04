# Contexto do projeto — Dr. Alberto Rassi

Este documento existe para dar contexto completo a um chat novo que vai construir o site do Dr. Alberto Rassi. Ele resume tudo que já existe e já foi decidido no projeto do chatbot de WhatsApp, que é o sistema com o qual o site vai conviver e se conectar.

## Quem é o Dr. Alberto Rassi

Radiologista intervencionista, atua em Goiânia-GO em três unidades: CRD, Hospital São Francisco de Assis e Hospital Albert Einstein. É especializado em diagnóstico por imagem (tomografia, ressonância magnética, ultrassom) e em procedimentos minimamente invasivos guiados por imagem, como biópsias e drenagens.

Secretária/contato humano de apoio: (17) 98172-4272.

## O que já existe: o chatbot de WhatsApp

Já está em produção um agente de atendimento via WhatsApp, construído como workflow no n8n, chamado **"Agente WhatsApp Dr. Alberto Rassi"** (ID `vS1TogAxFXY3D8Sv`, hospedado em `n8n-whats-n8n.dszsot.easypanel.host`).

### Arquitetura do chatbot

- **Entrada/saída de mensagens**: Evolution API (WhatsApp). Essa API pode ser reutilizada por qualquer outro sistema, inclusive o site — não é exclusiva do fluxo do bot.
- **LLM usado para conversa livre**: Groq (modelos gpt-oss-20b / llama-3.1-8b-instant). O LLM é usado **apenas** para gerar texto livre e extrair informação da mensagem do paciente — ele nunca controla o estado da conversa.
- **Máquina de estado determinística**: um nó de código chamado "Parsear Resposta Claude" é o único responsável por decidir em que passo da conversa o paciente está e o que acontece a seguir. Essa é uma decisão de arquitetura deliberada: nunca confiar no LLM para controle de fluxo, só para copywriting/extração.
- **Agenda**: Google Calendar é a fonte da verdade dos horários do médico (disponibilidade real).
- **Cadastro de leads/pacientes**: Google Sheets.
- **Estado de conversa em andamento**: Redis, com histórico limitado às últimas 10 mensagens (`history.slice(-10)`) e TTL — ou seja, **não existe hoje um histórico permanente da conversa**. Isso é um bloqueio técnico relevante para o site (ver seção de blocos abaixo).
- **Retry automático de falhas da API do Groq**: configurado nativamente no n8n (`retryOnFail`, até 5 tentativas, ~5s de espera entre elas) no nó "Claude API". Se mesmo assim falhar, o paciente recebe uma mensagem honesta de instabilidade + o contato da secretária, nunca um "erro técnico" cru.
- **Lock de conversa por paciente**: chave Redis `lock_{telefone}`, TTL de 60s, evita que duas mensagens do mesmo paciente sejam processadas em paralelo e causem inconsistência de estado.

### Regras de negócio importantes (não violar)

- **O Dr. Alberto nunca deve ser notificado automaticamente em nenhuma hipótese.** Existe um nó "Notificar Dr. - Urgência" que está desabilitado de propósito e deve continuar assim. Qualquer painel de urgência no site deve ser "pull" (o médico ou a secretária vão olhar quando quiserem), nunca "push" (nunca mandar notificação automática pro médico).
- Nunca mandar mensagem de teste para nenhum número além do número de teste autorizado (`11939011304`).
- CTA de agendamento em respostas de FAQ: já implementado e em produção. Quando o bot responde uma pergunta de FAQ (não uma saudação, não um fluxo de agendamento já em andamento, não em cima de urgência/recusa explícita), ele adiciona um rodapé convidando o paciente a agendar. Esse texto é 100% fixo em código (não é o LLM que escreve), justamente para ser mensurável e para nunca aparecer em contextos clinicamente sensíveis.
- Confirmação automática de consulta 23h antes: **ainda não implementada**, propositalmente adiada até o usuário rodar uma simulação de equipe (roleplay) antes de ativar.
- Migração de chaves de API hardcoded para credenciais nativas do n8n: pendente, adiada explicitamente pelo usuário — não mexer nisso por conta própria.

### Estado atual do fluxo (última validação)

O fluxo passou por uma rodada de testes reais (3 fluxos completos testados pelo usuário) e por um debate multiagente de QA que concluiu, por unanimidade, que o sistema está apto para a próxima fase. Dois itens não-bloqueantes ficaram identificados como próximos ajustes (ainda não corrigidos, aguardando confirmação do usuário para agir):
1. Uma pergunta de CTA redundante pode aparecer na terceira mensagem de um fluxo, quando o paciente já confirmou explicitamente que quer agendar.
2. Não há uma trava mínima de antecedência que impeça o sistema de oferecer um horário "daqui a poucos minutos" no mesmo dia.

## O que vai ser construído agora: o site

O usuário (Matheus) está desenvolvendo, para o Dr. Alberto Rassi, um site que a equipe (médico + secretária) vai usar no dia a dia para gerenciar os atendimentos — complementar ao chatbot, não substituto dele. As funcionalidades específicas planejadas para esse site estão no documento separado `SITE_DR_ALBERTO_ESPECIFICACAO.md`, que deve ser lido em conjunto com este.

### Decisões já tomadas sobre a stack do site

- **Google Calendar**: continua sendo a fonte da verdade da agenda — tanto o bot quanto o site vão ler/escrever nele. Isso cria um risco real de concorrência de escrita (dois sistemas tentando reservar o mesmo horário ao mesmo tempo) que precisa de um mecanismo de trava antes de qualquer feature do site escrever na agenda.
- **WhatsApp (Evolution API)**: reaproveitada para o site também poder disparar mensagens (ex: lembretes, aprovação de remanejamento).
- **Supabase (Postgres)** ou, alternativamente, **Postgres na própria VPS onde o n8n já roda** (via Easypanel) — para guardar dados que hoje não são persistidos de forma permanente, principalmente o histórico completo de conversas do WhatsApp (hoje limitado a 10 mensagens em Redis com TTL). Recomendação dada ao usuário: começar com Postgres na própria VPS por já ter custo zero e infraestrutura pronta; migrar para Supabase gerenciado só se precisar de funcionalidades prontas (autenticação, dashboards gerenciados, etc.).
- **Acesso da secretária**: o site é a ferramenta principal dela (visual, agenda, prontuário-resumo, aprovação de remanejamento com um clique). O WhatsApp entra só como canal complementar leve (notificação com botão de aprovar/rejeitar), nunca como uma forma dela digitar comandos dentro do mesmo número/fluxo que atende paciente — misturar os dois criaria risco de o bot confundir mensagem de admin com mensagem de paciente.

### Dois bloqueios técnicos que precisam ser resolvidos antes de certas features do site

1. **Persistência da transcrição completa do WhatsApp.** Hoje só existe em Redis, temporário e limitado. Funcionalidades que dependem de reconstruir a conversa inteira (resumo por IA, "modo espelho"/replay da conversa) estão bloqueadas até isso ser implementado.
2. **Mecanismo de trava para escrita concorrente na agenda.** Necessário antes de qualquer feature do site que escreva direto no Google Calendar (ex: remanejamento em 1 clique), para evitar duplo agendamento entre o site e o bot.
