# CLAUDE.md

Instruções permanentes para trabalho neste repositório (painel de gestão do Dr. Alberto Rassi).

## Git workflow

- Toda implementação concluída neste projeto deve ser commitada.
- Os commits usam a identidade `Matheus Xavier <toledomatheus071@gmail.com>`, configurada localmente neste repositório (`git config --local`), nunca a identidade global.
- Operações Git e GitHub são sempre realizadas pelo terminal.
- Nenhum commit pode conter autoria ou coautoria de IA (sem `Co-Authored-By: Claude`, sem `--author` alternativo).
- Alterações devem ser divididas em unidades lógicas pequenas e coerentes — evite commits gigantes que misturem funcionalidades diferentes.
- Arquivos devem ser adicionados explicitamente (`git add <arquivo>`), nunca `git add -A` ou `git add .` sem revisão do diff antes.
- Nunca commitar: `.env`, segredos, credenciais, logs com dados pessoais, `.next/`, `node_modules/`, `screenshots/` com dados reais, ou qualquer artefato gerado.
- Lint, testes e build devem passar antes do push final de cada unidade.
- O histórico publicado nunca deve ser reescrito (sem `git commit --amend` em commits já enviados, sem rebase de histórico público).
- `git push --force` é proibido.
- Mudanças preexistentes do usuário devem ser preservadas — nunca `git reset --hard` ou descarte de alterações sem confirmação.
- Cada sessão de trabalho deve terminar com `git status` e um resumo dos commits e pushes realizados.
