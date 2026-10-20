# Arena de Bairro 0.6 — Clube Vivo

Atualização implementada sobre os contratos da 0.5. Não contém anúncios ativos e não troca a engine, o mapa ou o renderizador herdados do projeto.

## O que muda ao jogar

A lanchonete deixa de ganhar um bônus invisível na bilheteria. Parte dos torcedores já admitidos visita o balcão, levando consigo a reserva de assento. Comprar alimentos desconta moedas e cria uma entrega física. Só o atendimento concluído consome um lanche e gera receita no caixa. Na fase 1, o gerente precisa estar presente; na fase 2 é possível contratar um atendente; na fase 3 há reposição automática, sempre paga. Estoque, caminho e filas importam. Os clientes desistem se esperarem demais.

Com o estádio concluído, o jogo oficial usa um estado de partida independente dos dois campos locais. Em casa, torcedores caminham até o estádio e pagam ao chegar. A operação da arena continua. Fora de casa não há bilheteria própria; o estádio serve como visão de acompanhamento, não como uma nova cidade visitante. O placar oficial só atualiza a tabela no fim. Gols de amistosos deixam de sobrescrever os avisos da partida oficial. Os artistas gráficos e animações existentes foram preservados; o sistema não é uma simulação física completa de futebol.

Compra, venda profissional e venda da base usam a mesma avaliação de atributos. Comprar e revender imediatamente gera prejuízo. Promover um jovem não muda seu valor automaticamente. A peneira tem uma cotação conservadora que impede lucro instantâneo apenas por revelar/promover/vender. O saldo anterior é preservado: não há retirada retroativa de moedas de saves existentes. Essa mudança precisa de testes com jogadores para ajustar o ritmo e não constitui balanceamento comercial certificado.

Os atletas passam a guardar origem, força na chegada, treinos concluídos, jogos oficiais e gols oficiais. O registro começa na atualização 0.6; partidas antigas não são inventadas. A promoção preserva a biografia. Há exportação local de um cartão PNG do clube ou atleta, sem upload automático, rastreamento, feed social ou ranking online.

A progressão possui 15 objetivos reclamáveis, seguindo da primeira entrega até estádio, formação, contratos e temporada; depois continua com objetivos de temporada. Completar o painel de funcionários não significa encerrar o clube. Receber uma recompensa é uma transação única.

O marketing oferece três contratos com parceiros fictícios. As metas contam atividades depois da assinatura e exigem entrega antes do prêmio. São mecânicas internas de carreira, não anúncios reais. Nenhum SDK publicitário foi instalado.

Painéis de elenco, mercado, base e liga não paralisam a operação; o menu de pausa continua parando o jogo. Controles de movimento ficam bloqueados atrás dos painéis. O reconciliador de interface preserva a identidade dos botões, o foco de edição e as interações durante atualizações de saldo e relógios.

Reiniciar a carreira mantém atletas e recursos, em vez de gerar outro elenco grátis para vender. Reiniciar toda a arena continua disponível no menu original, com confirmação. Reformar o estádio durante uma partida e trocar a escalação durante o jogo são recusados.

## Como o código foi integrado

- `tycoon-simulation.js` estende WorldSimulation; as transações ficam fora do renderer.
- `tycoon-economy.js` contém a avaliação comum e as cotações de estoque.
- `tycoon-model.js` guarda biografias, objetivos, contratos e estado de serviço.
- `tycoon-save.js` valida e persiste a extensão com migração dos saves anteriores.
- `tycoon-ui.js` acrescenta a experiência e a atualização incremental dos controles.
- `tycoon-view.js` acrescenta o estado visual das operações e lê o caixa correto.
- `ads-port.mjs` é uma interface inativa de preparação futura; não faz rede e nunca premia. Não é carregada no jogo.

O instalador copia apenas esses complementos, testes e documentação, e modifica pontos de integração em main.js, build, HTML e versão do pacote. Os arquivos `world-view.js`, `world-ui.js`, `simulation.js`, `world-simulation.js`, `roster.js`, `profile.js`, `server/`, `api/` e configurações privadas não são substituídos. Se o contrato de origem divergir, o instalador recusa e pede comparação; não existe opção force.

## Como publicar

Exporte o save no jogo existente antes de qualquer atualização. Extraia esta atualização FORA do repositório. Rode o aplicador em dry-run, depois aplique, execute npm run verify e confira o jogo. Envie as alterações reais ao GitHub com o agente já autenticado. Não envie o HTML de demonstração no lugar do projeto. O usuário cuida da Vercel; não fazer deploy automaticamente.

As variáveis privadas e os usuários existentes continuam os mesmos. A atualização não cadastra pessoas nem altera senhas. Os saves permanecem locais por perfil e origem; não há sincronização em nuvem. A versão anterior não conhece a extensão 0.6: não faça downgrade sem guardar backups.

## Não incluído nesta entrega

Não houve extração de código ou arte de jogos concorrentes, migração para uma engine 3D, multiplayer, serviço de anúncios, ranking online, editor livre de ruas, campos ilimitados ou promessa de viralidade. A partida ainda é uma apresentação de um resultado calculado; não há intervenção tática no intervalo que altere esse resultado. Essa é uma atualização de economia, operações e progressão, não uma reescrita completa de todo o plano de produto.
