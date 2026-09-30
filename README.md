# Arena de Bairro 0.5 — Mapa Vivo

Atualização implementada sobre a versão 0.4, correspondente ao commit remoto
`af0a14e2f24e43cbc820e633eca2d7125b41031f` consultado em 30/09/2026.

## O que mudou de verdade

A arena original e os terrenos da formação, do estádio e da sede aparecem no
mesmo espaço. Arraste o chão para mover a câmera, use a roda do mouse/pinça ou
os botões + e − para aproximar. WASD e joystick continuam movendo o gerente;
um toque curto no chão manda o gerente caminhar até lá.

Comprar um terreno no mapa abre a fronteira e permite atravessá-la. Clique na
placa do lote, confirme a compra e escolha uma instalação. Posicione a área
verde sobre o chão e confirme. A prévia vermelha indica que não cabe, que o
terreno não pertence ao clube ou que há outra construção próxima.

A equipe de obra percorre o mapa, aparece na fundação e trabalha. O custo é
retirado uma vez no início; o benefício só entra em vigor quando a obra termina.
Durante uma reforma, o prédio antigo continua no local, com andaimes. Há duas
equipes de obra e cinco fases por instalação, com três melhorias em cada fase.

Fase 1: estrutura simples. Fase 2: prédio maior e mais assentos. Fase 3: construção
mais alta, piso, cobertura e iluminação conforme a instalação. Fases 4 e 5:
novos detalhes, laterais e equipamentos. Essas partes são desenhadas por objeto,
não são rótulos sobre uma imagem única.

## Treinamento com recursos

Moedas são ganhas na operação e nas partidas. Os kits são produzidos no depósito
existente. O gerente pega kits e caminha até a entrada do CT para entregá-los.
Também é possível contratar um auxiliar logístico por 240 moedas: ele busca
kits reais no depósito e os transporta ao CT, priorizando não deixar os campos
sem material. Não há criação de kits pelo desenho da animação.

Treino individual: moedas + 1 kit no CT + tempo ativo de jogo.
Treino coletivo: custo calculado sobre os titulares elegíveis + 1 kit por grupo
de até 3 atletas + tempo ativo de jogo. O CT reduz custo/duração dentro dos limites.
A força aumenta somente na conclusão. Um segundo clique não cobra de novo nem
empilha treinos. Atletas em treino não podem ser vendidos/promovidos; partida
oficial e treino não começam simultaneamente.

## Executar

Node 22.16 ou superior foi o ambiente utilizado. Não exige WSL ou Docker.

```powershell
npm.cmd run verify
npm.cmd run dev
```

O site servido usa o login da 0.4. Preserve seu `.env.local` e as variáveis privadas
`ARENA_USERS_JSON` e `ARENA_SESSION_SECRET`. Os perfis Bernardo Cafure e Miguel
Matos e suas chaves de save não foram trocados. Nenhuma senha real está neste ZIP.

`JOGAR.html` é a demonstração independente: salve e abra no computador. Esse
arquivo permite escolher os perfis sem senha; não é autenticação de servidor.

## Interface

- **Expandir mapa / Mapa completo:** afasta a câmera, sem sair do jogo.
- **Formação, Estádio e Sede:** centralizam o local; não carregam outra cena.
- **Placa do terreno:** comprar ou escolher uma construção no lote já adquirido.
- **Prédio:** selecionar, reformar, levar o gerente ou abrir sua gestão.
- **Equipe da operação:** antigos upgrades de funcionários/equipamento, separados
  da progressão territorial. Completar essa lista não encerra o clube.
- **Elenco/Tabela/Base/Mercado:** mantêm as operações esportivas da 0.4.

## Compatibilidade e escopo

O save 0.4 é migrado adicionando a extensão `map`; moeda, jogadores, campeonato,
terrenos e níveis existentes são preservados. Instalações já compradas são
posicionadas automaticamente. Faça uma exportação JSON antes de atualizar.

Há quatro parcelas definidas (arena e três expansões); não é geração infinita
nem uma reprodução completa de SimCity/Age of Empires. Não há editor de estradas,
realocação/demolição, multiplayer ou nuvem. Os caminhos são criados automaticamente
para os acessos. A seleção de posição aplica-se às construções das expansões;
os campos/bilheteria originais permanecem nas posições da arte aprovada.

A arena original ainda utiliza ilustração pré-renderizada e sprites. As novas
construções e árvores são procedurais 2.5D, com acabamento mais simples. Parte do
entorno continua decorativa. Não é um motor 3D nem um jogo comercial certificado.

## Arquitetura e verificação

`world-model.js`: parcelas, implantação, caminhos e migração do mapa.
`world-simulation.js`: extensão da simulação existente com obras, movimentação
contínua, entregas e treino. `world-view.js`: câmera contínua e objetos por fase.
`world-input.js`: toque/arraste/joystick/pinça. `world-ui.js`: seleção contextual.
`server/auth.mjs` e `api/session.js`: preservados da 0.4.

Veja `docs/VALIDACAO.md` para os testes executados e suas limitações. O build gera
`dist/index.html`, `dist/assets/` e `JOGAR.html`. O usuário faz a publicação na Vercel.
