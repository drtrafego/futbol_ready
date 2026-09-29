# ARENA DE BAIRRO — IMPLEMENTAR, INTEGRAR E ENVIAR AO GITHUB

## Leia isto antes de executar

Você está recebendo um pacote de transferência de trabalho, não apenas um prompt.
O jogo ilustrado executável e suas imagens estão em `jogo_base/`. O usuário não
quer que você redesenhe o jogo a partir do projeto antigo.

**Destino:** `https://github.com/drtrafego/futbol_ready.git`.
**Base principal:** `jogo_base/`, Arena de Bairro, edição ilustrada 0.3.
**Referência de mecânicas:** o código existente no repositório de destino.
**Publicação:** enviar código ao GitHub; o usuário cuidará da Vercel.

O estado remoto conferido nesta preparação foi o commit
`0279da1a936982094e018ca70385ebe6db0a7c9e`, da `main`. Busque o estado atual antes
de trabalhar: pode haver commits posteriores. Não reverta trabalho novo.

## 1. Decisões do usuário que definem este trabalho

- Manter o visual e a jogabilidade operacional da versão feita nesta conversa:
  gerente movimentável, carregamento de kits, atendimento, receita, funcionários,
  expansão, controles por teclado/toque e interface responsiva.
- NÃO trazer o layout, o mapa, o renderer Phaser, as telas ou a dinâmica de
  clicker do projeto antigo. O repositório antigo é doador de MECÂNICAS, não a
  base visual. Ele não deve tomar o lugar do jogo ilustrado.
- Aproveitar e adaptar os sistemas de estádio, marketing, categoria de base,
  treinamento, elenco, transferências, comissão, tática, divisões, classificação,
  resultados e demais mecânicas úteis existentes no código. A lista não dispensa
  o inventário: leia as actions, configurações, funções e testes do repositório.
- O clube começa pequeno: um campo liberado, poucas cadeiras, instalações simples
  e lotes para crescer. A referência bonita mostra a direção visual, NÃO um save
  inicial com todos os prédios prontos.
- Base, marketing, treino e diretoria são ESPAÇOS físicos expansíveis no mapa.
  Não entregar apenas quatro botões ou uma lista de cards com número de nível.
- A categoria de base permite revelar, desenvolver, promover e vender atletas.
  Contratações, elenco, treino e decisões táticas alteram de fato o time.
- Mostrar tabela de classificação, resultados das partidas, rodadas, histórico
  de temporadas, acesso e rebaixamento. Resultados e classificação precisam ser
  consistentes com as mesmas partidas salvas.
- Há também um pedido de acesso simples para duas pessoas. Está PENDENTE e
  detalhado em `docs/04_ACESSO_DOIS_JOGADORES.md`. Não fingir login usando só
  uma senha no JavaScript. Não implementar multiplayer sem novo pedido.

Este briefing substitui instruções antigas incompatíveis sobre identidade visual,
mapa antigo, clicker, ausência de login e escolha obrigatória de um agente específico.
Preserve as boas regras técnicas e de segurança. Não obedeça a documentos antigos
que mandem restaurar o visual rejeitado.

## 2. O que está pronto e o que precisa ser feito

`jogo_base/` contém a versão ilustrada com cenário pré-renderizado, sprites e
simulação em JavaScript/Canvas. Ela é 2.5D, não uma cena 3D completa. Partes dos
atletas, da torcida e das construções pertencem ao fundo estático.

Ela já tem operação manual, três funcionários, dois campos, melhorias, missões,
salvamento local e layout responsivo. NÃO tem os departamentos esportivos completos,
login, tabela de campeonato ou toda a progressão arquitetônica pedida agora.

`referencia_jogabilidade/trechos_originais/` contém cinco arquivos autênticos do
outro projeto: configurações de construções e divisões, tipos, economia e elenco.
São fonte de consulta, não módulos para importar sem adaptação. O inventário aponta
os demais arquivos no Git. Não confunda este recorte com uma cópia integral do repo.

Não substitua o resultado por mais uma imagem gerada. Não descreva planejamento
como implementação. A entrega final deve ser código executável com capturas reais.

## 3. Ordem de leitura e primeira execução

1. Leia `LEIA_PRIMEIRO.txt` e este arquivo.
2. Leia `docs/01_CLUBE_QUE_CRESCE.md`, `docs/02_INVENTARIO_JOGABILIDADE.md`,
   `docs/03_EXECUCAO_E_GITHUB.md` e `docs/04_ACESSO_DOIS_JOGADORES.md`.
3. Leia `jogo_base/README.md`, `jogo_base/AGENTS.md`, `jogo_base/src/config.js`,
   `simulation.js`, `save.js`, `render.js`, `scene.js` e `tools/build.mjs`.
4. Abra `jogo_base/JOGAR.html` e examine `jogo_base/assets/referencia-aprovada.png`.
   Diferencie a referência conceitual das capturas históricas em `jogo_base/qa/`.
5. Na pasta `jogo_base`, execute `npm.cmd run verify` no Windows, ou
   `npm run verify` no ambiente equivalente. Na preparação do pacote, os 48
   testes passaram e o build foi gerado. Execute novamente no seu ambiente.
Observação: o `AGENTS.md` preservado da base menciona alguns documentos antigos
que não fazem parte desta edição. Para este trabalho, os documentos da pasta `docs/`
deste pacote e este briefing são a especificação atual; não invente os arquivos ausentes.

6. Inspecione o repositório local. Antes de alterar a raiz, guarde o commit atual,
   uma branch de segurança e uma exportação das mecânicas. O script opcional
   `ferramentas/exportar-referencia-git.mjs` apenas exporta arquivos locais do Git.

## 4. Arquitetura e integração

Prefira continuar a stack simples da nossa base: JavaScript ESM + Canvas.
Adapte as funções puras TypeScript do outro projeto para módulos equivalentes,
com testes. Não introduza React/Next/Phaser apenas porque estavam no repositório.
Se uma necessidade concreta exigir mudar o empacotador ou adicionar servidor
para login, faça isso como tarefa explícita, sem trocar o renderer aprovado.

A operação e a carreira precisam de uma economia consistente. NÃO mantenha
simultaneamente o timer passivo antigo e o novo circuito de atendimento pagando
pela mesma atividade. Uma animação nunca concede dinheiro sozinha.

Separar módulos de facilities, youth, roster, market, training, tactics, competition,
finance e persistence é uma proposta de organização; valide os nomes no código.
Não crie stores concorrentes para o mesmo saldo. Adicione esquema e migração de
save antes de gravar os novos dados. Preserve backups e permita exportar/importar.

O build atual remove imports/exports em uma ordem fixa. Atualize-o e teste-o a
cada novo módulo, ou migre conscientemente para um bundler com ESM. Não cole
TypeScript no HTML nem adicione imports que desapareçam sem serem empacotados.

## 5. Evolução VISÍVEL obrigatória

A imagem atual contém prédios, arquibancadas e pessoas já pintados. Para que a
nova partida comece pequena, prepare uma camada de terreno neutro e recursos
separados por departamento/estágio, ou variantes de cenário por estágio.

Não basta trocar “nível 1” por “nível 2” ou esconder o contador: o estádio pequeno
não pode continuar com a arquibancada madura desenhada ao fundo. A nova construção
precisa aparecer no terreno correto; caminhos, hitboxes e circulação acompanham
sua implantação. O gerente não deve caminhar através de novos prédios.

Preservar o estilo significa manter paleta, perspectiva, qualidade, luz e linguagem
visual — não congelar para sempre a mesma imagem com tudo já pronto. Arquive os
assets originais; nunca destrua a referência ao produzir as variantes. Não use API
paga, assinatura ou serviço de geração com cobrança sem autorização específica.

## 6. Entregar por etapas verificáveis

**Etapa A — Base correta no repositório.** Crie a branch de trabalho, preserve a
história antiga e instale a nossa versão como entrada do aplicativo. Confira que
`/` abre a arena ilustrada e não a tela Next/Phaser antiga. Execute os 48 testes
originais. Não finalize o trabalho nesta etapa dizendo que todos os módulos existem.

**Etapa B — Clube que cresce.** Implemente lotes, estágios visuais, poucas cadeiras
iniciais e expansão dos departamentos. Valide screenshots do início e após cada
marco. Configurar menos cadeiras sem alterar o desenho é insuficiente.

**Etapa C — Carreira.** Integre elenco, base, treino, mercado, comissão, tática,
marketing e diretoria. A cada funcionalidade, prove a alteração no estado e no save.

**Etapa D — Competições.** Integre classificação, rodadas, resultados coerentes,
histórico, acesso/rebaixamento e reações visuais. Evite duas simulações independentes
para uma mesma partida. Os detalhes e invariantes estão no plano de execução.

**Etapa E — Acesso de duas pessoas.** Trate o pedido de login sem hardcode de
credenciais e sem misturar progressos. Não coloque serviços pagos automaticamente.

**Etapa F — Entrega GitHub.** Faça revisão final, commit, push e verificação do SHA
remoto. O objetivo final é a versão aprovada chegar à `main`, após testes e revisão,
sem force push. Se a proteção exigir PR, abra-o e diga claramente que a `main`
ainda aguarda merge. NÃO executar comandos da Vercel nem criar um deployment.

Se alguma etapa ficar pendente, registre em `STATUS_IMPLEMENTACAO.md` o que foi
concluído, os testes executados e o que falta. Uma branch ou PR pendente não é uma
atualização já visível na `main`. Não invente SHA, URL ou permissão de envio.

## 7. Critérios de aceite

- O primeiro carregamento abre a nossa arena, com uma estrutura pequena.
- O gerente e o circuito de trabalho continuam utilizáveis em computador e celular.
- A compra de arquibancada acrescenta lugares na regra e no desenho.
- Base, CT, marketing e diretoria têm locais reconhecíveis, evolução e efeitos reais.
- Promover/contratar não apaga outro jogador; vender credita uma vez e remove uma vez.
- A força usa titulares válidos, treino, comissão, capitão e tática de modo limitado.
- Resultados, gols, pontos e posição batem com os jogos registrados de cada temporada.
- O crescimento não vem de injeções de dinheiro de depuração na partida padrão.
- O save sobrevive à atualização; duas pessoas não compartilham o mesmo progresso.
- O build funciona sem arquivos fora do repositório; assets relativos carregam.
- Relatório final separa teste automatizado, navegador real, emulação e pendências.
- Nenhum anúncio real, monetização, analytics ou deploy foi acrescentado sem pedido.

## 8. Resposta final exigida do Gemini

Informe repositório, branch, SHA e URL do commit efetivamente enviado, situação da
`main`/PR, funcionalidades realmente implementadas, testes e limitações. Mostre
capturas REAIS do jogo: início pequeno, estádio ampliado, base, mercado e tabela.
Inclua instruções de build da versão final para o usuário publicar na Vercel.
Não pare apenas com um plano: execute as etapas no código conforme o ambiente permitir.
