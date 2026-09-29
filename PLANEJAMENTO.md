# Jogo do Bernardo, clube de futebol idle

Documento único de planejamento. Fonte de verdade pra quem for implementar (Codex, Gemini ou qualquer dev). Reescrito do zero em 27/09/2026 pra refletir o estado REAL do código depois da migração pra Phaser 3, consolidando o histórico de correções anterior num só lugar em vez de espalhado. Se algo aqui for tecnicamente incompatível com o stack na hora de codar, quem estiver implementando corrige por conta própria, da forma mais pragmática, e deixa um comentário curto explicando o ajuste.

## O que é

Jogo idle/clicker de time de futebol, pra uso pessoal do Bernardo, acessado pelo navegador do celular e publicado como site na Vercel. Sem monetização, sem loja, sem anúncio, sem login, sem backend, sem banco de dados.

## Regras de processo, inegociáveis

1. **Claude só coordena, nunca escreve código de produção.** Toda implementação passa pelo Codex CLI (via `codex:codex-rescue`, rodando em segundo plano/background). Claude escreve o prompt, aguarda o resultado, confirma `pnpm build`, e reporta. Isso vale a partir de 27/09/2026 (ordem direta do dono do projeto).
2. **Nunca gerar imagem nova (Magnific ou qualquer API paga) sem autorização explícita** ("gera", "renderiza", "faz a imagem"). O Codex tem ferramenta de geração de imagem própria e pode ser usado pra isso quando fizer sentido (ex.: textura de terreno), mas ainda assim sem exagerar em gerações desnecessárias.
3. **Abrir e ler material real antes de decidir estilo** (ícones em `public/arte/`, imagens em `_referencias/`), nunca decidir de memória.
4. **`pnpm`, nunca `npm`/`yarn`.** Não deixar `pnpm dev` esquecido rodando em segundo plano (pasta dentro do Google Drive espelhado, causou apagamento em massa antes). Rodar `pnpm build` depois de qualquer mudança na cena Phaser antes de considerar concluído.
5. Cache `.next` pode corromper por causa do sync do Google Drive (erro tipo `routes-manifest.json` não encontrado): mover/apagar `.next` e rodar de novo resolve.

## Referência de estilo: por que Age of Empires (1997), não Pizza Ready! 3D

Referência inicial de mecânica era Pizza Ready! (io.supercent.pizzaidle) e Eatventure, mas o dono do projeto corrigiu o rumo visual: **o benchmark real é Age of Empires original, estilo "mapa de base que evolui", não uma grade de ícones bonitos tipo catálogo.** Pizza Ready é Unity 3D genérico (confirmado: é um dos milhares de "template game" vendidos prontos em marketplaces tipo Codester/CodeCanyon), sem tanto capricho de composição quanto o AoE1 tinha pra época dele.

O que isso significa na prática, decisão definitiva:

1. **Existe UMA base viva, persistente e sempre visível** — não uma cena entre quatro abas equivalentes, não uma lista de cards. As construções do jogo (bilheteria, lanchonete, torcida, treinamento, categoria de base, comissão técnica) são objetos físicos plantados no mapa, em posições orgânicas (nunca alinhadas em grade tipo menu de ícones), cada uma clicável ali mesmo pra evoluir.
2. **Tem que ter "o jogo ocorrendo ali"**, não só cenário bonito parado: personagens precisam ir até as construções e "trabalhar" fisicamente nelas, com a receita nascendo visualmente no local e momento exatos daquele trabalho — conexão causa-efeito visível, igual o aldeão de AoE que vai até a árvore, corta, carrega o recurso, e só então o contador sobe.
3. Detalhe gráfico importa menos que estrutura de mapa livre e movimento acontecendo. Boneco simples que se move de verdade vale mais que boneco bonito parado.
4. Card **não é proibido**: serve bem pra uma decisão com trade-off real (ex. dois tipos de assento de arquibancada com trade-off), nunca pra ser a interface principal do jogo nem pra virar grind repetitivo de "next level, aperta de novo".

## Stack

Next.js 15 (App Router) + TypeScript strict + Tailwind v4 + Zustand + Zod (save) + Vitest (testes de `src/lib/`) + Phaser 3/4 (cena viva). `pnpm` como gerenciador único. Deploy Vercel.

Toolchain de jogo instalada e gratuita: skill pack `game-creator` em `.claude/skills/` (destaque: `phaser` pra arquitetura de cena, `add-assets` pra sprite pixel art gerado por código). `retrodiffusion` (skill instalada mas PAGA) e o MCP oficial da phaser.io (pago, $0.01/min) não devem ser usados sem autorização explícita.

## Arquitetura atual (estado real do código, auditado em 27/09/2026)

### A Base (cena viva, `src/phaser/BaseScene.ts` + `BaseCanvas.tsx`)

- Terreno real (`public/arte/terreno-base.png`, textura de grama com variação e trilhas, gerado via Codex), cobrindo a tela inteira.
- 6 construções em posições percentuais orgânicas (não grade), usando os ícones de arte já existentes (`public/arte/icone-*.png`, `public/arte/icones/*.jpg`). Cada uma mostra nome, nível, cadeado quando bloqueada por `divisaoMinima`, cresce em 3 estágios de escala por nível, e ao tocar chama `comprarConstrucao` (ou `tocarTreinoAtivo` pra "base"). Tem sombra elíptica no chão pra dar sensação de objeto assentado no terreno (máscara circular na imagem ainda não confirmada/pode estar parcial, conferir).
- **3 personagens** (não mais 1) circulam entre as construções, cada um "trabalha" fisicamente numa construção por alguns segundos, e a receita visual "+R$" nasce exatamente ali, no momento do trabalho — não mais um timer solto e desconectado.
- Área de toque ativo da peneira da base (barra de progresso + contador) já está dentro do próprio mapa, funcional.
- **Falta:** elementos de progressão visual ligados à DIVISÃO do clube (refletores a partir de uma divisão intermediária, telão/placar numa divisão alta — ver backlog).

### Navegação (`JogoBernardo.tsx`)

A Base fica sempre montada como camada de fundo permanente. Construções/Elenco/Clube abrem como painel deslizante (bottom sheet) por cima dela, nunca substituindo a tela inteira. Confirmado funcionando.

### Elenco (`ElencoView.tsx`)

100% funcional, não é só UI: 11 titulares reais por posição, treinar titular (`treinarTitularAction`, custo cresce por jogador), mercado de transferências com renovar/contratar, peneira da base com promover/vender. Tudo mexe no store de verdade.

### Clube (`ClubeView.tsx`)

Tabela de classificação real (rivais gerados, colunas J/V/E/D/SG/PTS, linha do jogador destacada, indicadores de zona de acesso/rebaixamento) + trilha de divisões com estatísticas de carreira. Editar time e "recomeçar do zero" funcionais.

### Economia (`src/config/construcoes.ts`, `divisoes.ts`)

6 construções com custo exponencial (`custoBase` + `fatorCrescimento`) e 6 divisões (Série D até Mundial) com multiplicador de receita de 1x a 120x. Partida automática a cada 60s (tick real de 250ms), 10 partidas por temporada, promoção/rebaixamento decidido pela POSIÇÃO NA TABELA de rivais (não só pontos isolados) — já implementado de verdade em `partidas.ts`.

### Save (`src/lib/save.ts`)

Schema Zod completo, `versao: 3`. **Falta:** função de migração entre versões (não localizada na auditoria).

### Criação de time (`CriarTimeModal.tsx`)

Nome, sigla, cor, escudo (SVG). Sequência confirmada: cria o time primeiro, a Base só aparece depois de confirmar.

### Testes (`tests/`)

Cobrem fórmulas de `economia.ts` e a simulação de `partidas.ts` (com RNG mockado, determinístico). **Falta:** cobertura de `elenco.ts` e `save.ts`.

## Status do Backlog e Entregas

1. **Base Viva Estilo Age of Empires 1 + Arcade Idle Pizza Ready:** CONCLUÍDO.
   - Campo de futebol oficial no centro com linhas, traves, jogadores uniformizados trocando passes e chutando a gol, com toque ativo de treino.
   - 6 edifícios físicos assentados no solo com fundação, paredes, telhados, toldos, balcões, catracas e medalhões oficiais.
   - Malha de caminhos de terra batida e pedra interligando a bilheteria, o campo, a lanchonete e a arquibancada.
   - Pilhas de moedas 3D coletáveis no chão na Bilheteria e Lanchonete com efeito tátil.
   - Fluxo contínuo de torcedores chegando pela rua, comprando ingressos na catraca, visitando a lanchonete e vibrando na arquibancada.
2. **Máscara circular + sombra nos ícones:** CONCLUÍDO (texturas pré-recortadas via canvas e integradas às fachadas).
3. **Elementos de estádio profissional por divisão:** CONCLUÍDO (refletores, telão e ônibus da delegação).
4. **Repaginação de ConstrucoesView.tsx:** CONCLUÍDO (painel esportivo alinhado à Base, remoção das estrelas decorativas).
5. **Migração de save entre versões:** CONCLUÍDO (`migrarVersaoSave` em `save.ts`).
6. **Suíte completa de testes:** CONCLUÍDO (34 testes unitários passando em `economia`, `partidas`, `elenco` e `save`).
7. **Treinar titular e contratar jogador:** CONCLUÍDO.
8. **Tabela de classificação:** CONCLUÍDO.

## Fora do escopo desta v1

Monetização, loja, anúncio, login, multiplayer, backend/banco de dados.
