# Validação — edição visual 0.3

## Executado

`npm run verify`: verificação de sintaxe, **48 testes Node aprovados**, compilação de `dist/index.html` e `JOGAR.html`.

`python qa/check_browser.py`: **37 verificações aprovadas** — 32 de navegador e 5 HTTP separadas. O script requer Python, Playwright e Chromium; não faz parte do build da Vercel. O relatório JSON registra os critérios individualmente.

A interface foi examinada em 1536×960, 390×844, 360×800, 320×568, 768×1024, 844×390, 1024×768 e 1920×1080. Os testes checam ausência de alargamento horizontal da página, abertura de menus, disponibilidade dos controles, navegação, receita, transporte, compras, pausa e movimentação com o controle virtual. Isso não prova, por si só, ausência de todos os problemas de sobreposição ou acessibilidade.

O segundo campo mostrado nas capturas foi aberto pela jornada de teste usando receitas da simulação. O relógio da simulação foi acelerado pelo gancho opcional `debug=1`; o saldo não foi alterado diretamente. O jogo normal começa com zero moedas e o segundo campo fechado.

## Ambiente e limites

Linux, Node 22.16.0 e Chromium. A política do navegador bloqueou `page.goto` para localhost. Foi usado o HTML independente produzido pelo build, montado em uma página vazia via `set_content`, com somente o gancho opcional de QA habilitado. O armazenamento foi substituído por um adaptador em memória. Não alegamos que esses testes exercitaram localStorage real, um deploy público ou o ambiente Windows.

O servidor real foi consultado com Python para verificar HTML e recursos gráficos. Isso verifica a entrega local dos arquivos, mas não substitui um teste integrado do navegador navegando até a Vercel.

## Verificar antes de distribuir

1. Abrir o deploy real na Vercel e confirmar que as imagens carregam sem 404.
2. Jogar no Android/iPhone físico, inclusive girar a tela e retornar de outra aba.
3. Salvar, encerrar o navegador, reabrir e conferir o progresso real.
4. Exportar e importar um backup de Arena de Bairro.
5. Conferir o modo aproximado em telas pequenas: parte da textura é uma adaptação da ilustração, não geometria 3D.
6. Revisar qualquer integração com o outro repositório antes de substituir sua versão existente.

As capturas PNG em `qa/` são capturas do programa em execução, não novas imagens conceituais.
