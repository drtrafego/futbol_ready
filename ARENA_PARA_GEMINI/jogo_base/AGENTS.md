# Regras para agentes de programação — Arena de Bairro

## Objetivo e ambiente

Evoluir um jogo original de gestão de arena de futebol. Windows nativo, sem WSL, Docker, VM ou servidor remoto obrigatório. O protótipo usa JavaScript ESM, Canvas 2D e ferramentas nativas do Node; não há React, Next.js, TypeScript, Vite ou engine externa instalados.

Antes de alterar, leia README.md, docs/00_PLANO_EXECUCAO.md, docs/02_ARQUITETURA.md e os arquivos afetados. Não recrie todo o projeto. Não acrescente API de LLM ao jogo: agentes de IA são ferramentas de desenvolvimento, não uma dependência de execução.

## Fonte da verdade

Edite src/, index.html, tools/, tests/ e docs/. JOGAR.html e dist/index.html são artefatos gerados por npm run build. Não altere somente o build. Respeite a ordem explícita de módulos em tools/build.mjs e os imports de uma linha; o empacotador é propositalmente restrito. Uma mudança para bundler de mercado exige tarefa própria e aprovação de escopo.

simulation.js não deve acessar DOM, localStorage, relógio de parede, áudio ou rede. render.js não deve mudar carteira, estoque, tempo de partida ou regras. Efeitos não podem conceder recompensas. ui.js só chama ações; não manipula saldo diretamente.

## Invariantes

Moedas inteiras e não negativas. Uma cobrança por torcedor admitido; um bônus por partida concluída. Compra validada e debitada uma vez. Limites de estoque, transporte, visitantes e assentos sempre respeitados. Campo bloqueado não produz. Ticks limitados. Save importado validado por lista permitida, nunca mesclado cegamente. Não apague dados incompatíveis automaticamente.

Nenhuma moeda tem valor real. Save local editável não é anti-cheat. Não coloque segredos, tokens, chaves de anúncios ou credenciais de loja no cliente. Não adicione cobrança, analytics, rastreamento, publicidade, login ou publicação sem autorização explícita.

## Fluxo obrigatório

Crie um checkpoint ou branch antes da mudança. Escolha UMA tarefa do backlog. Explique quais arquivos pretende modificar. Acrescente teste de regressão quando corrigir comportamento. Execute npm run verify; no Windows, npm.cmd run verify. Abra o build no navegador e confira os controles afetados. Atualize a documentação correspondente.

Ao entregar uma mudança, informe arquivos alterados, testes realmente executados, passos manuais de validação e limitações. Não afirme que testou Windows, Android, performance, loja ou dispositivos físicos se isso não ocorreu. Não use valores de receita, retenção ou aprovação como promessas.

## Escopo comercial

Não copie código, personagens, mapas, logos, áudio ou identidade visual do jogo de referência. Use nomes e clubes fictícios. “Arena de Bairro” é nome de trabalho, ainda sem pesquisa de disponibilidade. Componentes ou assets externos precisam de origem e licença registradas.

## Edição visual 0.3

Leia README.md, docs/VALIDACAO.md e docs/INTEGRACAO.md. Preserve a arte aprovada em assets e a divisão entre simulação e renderização. Não substitua os recursos ilustrados por formas geométricas básicas sem solicitação do usuário. Não descreva esta apresentação como 3D real: o fundo é pré-renderizado e parte dos personagens é decorativa. Não altere o saldo por animações. Execute npm run verify. Para testes visuais, relate honestamente o modo de carregamento do HTML e os limites do armazenamento emulado. Nenhum outro repositório foi fundido a esta versão.
