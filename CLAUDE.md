# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

Jogo idle/clicker de time de futebol, feito pra uso pessoal de uma criança (o Bernardo), acessado pelo navegador do celular e publicado como site na Vercel. Sem monetização, sem loja, sem anúncio, sem login, sem backend, sem banco de dados.

**A especificação completa e autoritativa vive em `PLANEJAMENTO.md`, nesta mesma pasta. Leia esse arquivo inteiro antes de implementar qualquer coisa nova ou decidir arquitetura.** Ele cobre: estilo visual (confirmado ao vivo nas referências Pizza Ready! e Eatventure na Play Store), economia e fórmulas de custo, evolução por divisões com partidas automáticas e temporada, criação de time (nome, cor, escudo em SVG), ganho offline sem teto, esquema de save, telas e responsividade. Não repita aqui o que está lá.

Este mesmo projeto também é trabalhado via Gemini CLI, que lê `GEMINI.md` como seu próprio arquivo de instruções. Se ajustar uma decisão de projeto, mantenha `PLANEJAMENTO.md` como a fonte única e atualize `GEMINI.md` só se o ponto for daqueles fáceis de esquecer (está listado lá quais são).

## Comandos

Gerenciador de pacote é `pnpm`, nunca `npm` nem `yarn` (declarado em `packageManager` no `package.json`).

```bash
pnpm install       # instalar dependências
pnpm dev           # servidor de desenvolvimento (Next.js), não deixar rodando sem necessidade
pnpm dev -p 4000   # sobe numa porta específica (útil quando a 3000 já está ocupada por outra sessão)
pnpm build         # build de produção, sempre rodar depois de qualquer mudança na cena Phaser
pnpm lint          # eslint (eslint-config-next, core-web-vitals + typescript)
pnpm test          # vitest run (sem watch), roda tests/*.test.ts contra src/lib/
```

Não deixar `pnpm dev` esquecido rodando em segundo plano: esta pasta fica dentro do Google Drive espelhado, e processo de build/watch esquecido rodando já causou apagamento em massa nesta máquina antes. Se `pnpm build`/`pnpm dev` falhar com erro estranho tipo `routes-manifest.json` não encontrado ou `_not-found` page data, é cache `.next` corrompido pelo sync do Drive: apagar/mover a pasta `.next` e rodar de novo (causa raiz documentada em `next.config.ts`, já mitigada lá com `config.cache = false`, mas pode voltar a acontecer).

## Arquitetura

Next.js (App Router) com TypeScript strict, Tailwind v4, `src/` como raiz de código. É um jogo single player que roda inteiro no cliente: não há Server Actions, API Routes, autenticação nem variável de ambiente. `app/page.tsx` é Server Component e só renderiza `JogoBernardo.tsx` (Client Component); toda a lógica de estado, laço do jogo (tick por tempo real via `setInterval`, nunca `requestAnimationFrame`) e persistência em `localStorage` roda no navegador.

Estrutura de código:

- `src/config/`: dados de balanceamento e definição, sem lógica (construções, divisões, paletas de cor do time, peças de escudo). É o lugar de ajustar números do jogo sem mexer em lógica.
- `src/lib/`: funções puras de regra de jogo (economia/fórmulas de custo e receita, elenco, partidas, save). Testadas isoladamente com Vitest (`tests/economia.test.ts`, `tests/partidas.test.ts`), sem depender de React ou de estado global.
- `src/types/game.ts`: os tipos do estado do jogo (`EstadoJogo`, `BuildingId`, `Jogador`, `PartidaResultado` etc).
- `src/store/useGameStore.ts`: store Zustand único (`useGameStore`), dono de todo o estado (`estado: EstadoJogo`) e das actions que orquestram `src/lib/` (comprar construção, jogar partida, treinar jogador, contratar no mercado, tick passivo, save/load). É a única ponte entre a UI/cena e a lógica de jogo.
- `src/components/`: telas e componentes React/Tailwind. `JogoBernardo.tsx` é o componente raiz: monta a Base (`EstadioView.tsx`) como camada permanente de fundo, e renderiza Construções/Elenco/Clube como um painel deslizante (`bottom sheet`) que sobe por cima dela via `telaAtiva` do store, nunca substituindo a Base inteira.
- `src/phaser/`: a cena viva do jogo (a "Base"), renderizada em canvas via Phaser 3/4, não em DOM/CSS. `BaseCanvas.tsx` monta o `Phaser.Game` num Client Component sem SSR; `BaseScene.ts` é a cena única, desenha o terreno (`public/arte/terreno-base.png`), as 6 construções em posições orgânicas (não em grade) usando os ícones de `public/arte/icone-*.png`/`public/arte/icones/*.jpg`, e o(s) personagem(ns) animado(s) com tween de perna. A cena LÊ o estado com `useGameStore.getState()`/`subscribe` e chama as mesmas actions do store ao detectar toque numa construção; não duplica lógica de jogo.

Decisão de arquitetura registrada (não repetir a discussão, só consultar se precisar do porquê): a tela principal deveria ser uma única base viva estilo Age of Empires/tycoon, com as construções plantadas fisicamente no mapa, não uma navegação de abas com listas de card. Ver `PLANEJAMENTO.md`, seção "DECISÃO DEFINITIVA..." e "6.3 Correção de rumo", para o histórico completo dessa virada.
