# GEMINI.md

Instruções de projeto pro Gemini CLI neste repositório.

## LEIA ISTO PRIMEIRO: diretriz final do dono do projeto

"Faz um jogo de bonecos em movimento, não um jogo de cards e apertar botões, esse jogo é chato." Isso é ordem direta, depois de ele analisar 6 vídeos de referência com a gente. Card de upgrade não é proibido (existe até nas referências), mas NÃO pode ser a cara do jogo. A cena viva, com bonecos se movendo e reagindo ao toque, é a prioridade número um, sempre. Se tiver que escolher onde investir mais tempo entre polir um card e dar mais vida a um boneco na cena, escolhe o boneco. Ver seção "DIRETRIZ FINAL" logo no início do `PLANEJAMENTO.md` pro detalhe completo. Tome o tempo necessário pra fazer isso direito, não tem pressa artificial.

**Antes de escrever qualquer código ou gerar qualquer arte, leia o arquivo `PLANEJAMENTO.md` inteiro, nesta mesma pasta.** É a fonte ÚNICA de verdade da especificação deste jogo (mecânica, economia, evolução, save, e a seção 9 sobre a arte gerada por IA). Não decida nada disso de novo, e não repita o conteúdo aqui: se precisar atualizar alguma decisão, atualize o `PLANEJAMENTO.md`, não crie ou duplique em outro arquivo.

Antes de gerar arte, abra também as imagens em `_referencias/` na raiz do projeto: são a âncora visual real do estilo já aprovado, não decida estilo de memória.

Regras curtas que valem sempre: `pnpm` em tudo, nunca `npm`/`yarn`. Não deixar `pnpm dev` rodando em segundo plano sem necessidade (pasta dentro do Google Drive espelhado). Se algo for tecnicamente incompatível com o stack, corrija por conta própria da forma mais pragmática e comente o ajuste, sem travar esperando confirmação de detalhe.

## Tarefas e status de implementação

### 1. Migrar de "abas de card" pra UMA BASE viva estilo Age of Empires, renderizada em Phaser 3
**STATUS: CONCLUÍDO.** `src/phaser/BaseScene.ts` e `BaseCanvas.tsx` montam a base viva com:
- Terreno real (`public/arte/terreno-base.png`), cobrindo a tela inteira.
- 6 construções em posições orgânicas com aro circular e sombras no chão.
- Clique funcional chamando `comprarConstrucao` com pulsar e feedback flutuante.
- 3 personagens animados circulando entre as construções, trabalhando nelas com receita flutuante pontual.
- Área de toque ativo da Peneira da Base integrada no mapa com partículas e barra vertical de progresso.
- Painéis secundários (Construções, Elenco, Clube) abrem como bottom sheet por cima da base permanente.

### 2. Feature: treinar titular e contratar jogador
**STATUS: CONCLUÍDO.**
- **Treinar titular:** Botão no card de cada titular na aba Elenco, incrementa o overall em +1 e escala o custo exponencialmente por jogador (`calcularCustoTreino`, `treinarTitular` em `src/lib/elenco.ts`).
- **Contratar jogador:** Mercado de transferências procedural com 3 opções balanceadas por divisão, renovando periodicamente (`gerarMercadoTransferencias`, `contratarJogadorMercado` em `src/lib/elenco.ts`).

### 3. Rebalanceamento da economia
**STATUS: CONCLUÍDO.**
- Parâmetros calibrados em `src/config/construcoes.ts` e `src/config/divisoes.ts`.
- Ritmo de progressão ajustado para progressão duradoura ao longo das divisões.

### 4. Feature: tabela de classificação de verdade
**STATUS: CONCLUÍDO.**
- Tabela com 8 clubes rivais por divisão em `src/lib/partidas.ts`.
- Simulação de rodadas dos rivais em paralelo às partidas do jogador.
- Exibição completa na aba Clube (J, V, E, D, SG, PTS) com destaques de G-2 promoção e Z-2 rebaixamento.
- Partidas em tempo real simuladas com notificação ágil em toast e botão direto para visualizar a tabela, sem modais que interrompam o fluxo da base viva.

### 5. Marcos de "estádio profissional" por divisão (refletores, telão, delegação)
**STATUS: CONCLUÍDO.**
- **Refletores/holofotes:** 4 torres metálicas com base de concreto e lâmpadas LED visíveis a partir da Série B (`divisaoIndex >= 2`).
- **Telão eletrônico:** Painel LED no topo central com placar da rodada e nome do time, visível a partir da Série A (`divisaoIndex >= 3`).
- **Ônibus da delegação:** Veículo do time cruzando a base periodicamente com letreiro personalizado.

### 6. Sistema de Save e Migração entre Versões
**STATUS: CONCLUÍDO.**
- `migrarVersaoSave` exportada em `src/lib/save.ts`, convertendo versões antigas (v1, v2) para o schema v3 com validação estrita via Zod.
- Backup automático em `CHAVE_SAVE_BACKUP` caso detecte dados corrompidos.

### 7. Suíte de Testes Automatizados
**STATUS: CONCLUÍDO.**
- 34 testes unitários cobrindo `economia.ts`, `partidas.ts`, `elenco.ts` e `save.ts`.
- `pnpm test` e `pnpm build` validados e passando com sucesso.

### 8. Itens visuais de acabamento e polimento
**STATUS: CONCLUÍDO.**
1. **Máscara e recorte circular nos ícones de construção:** `src/phaser/BaseScene.ts` gera texturas perfeitamente recortadas em círculo via canvas (`gerarTexturasCirculares`) eliminando os cantos das fotos quadradas (`.jpg`/`.png`), além de aplicar e sincronizar dinamicamente a `Phaser.Display.Masks.GeometryMask` circular nos eventos de escala e pulsar (`pulsarConstrucao`).
2. **Repaginação de `ConstrucoesView.tsx`:** Fundo e paleta alinhados à atmosfera do campus/estádio da Base (`slate-900`/`emerald-950`), ícones circulares com aro temático idênticos aos da Base, remoção das estrelas decorativas sem função real, adição de dica de gameplay ativa e botões de upgrade esportivos e limpos.
3. `pnpm test` (34 testes) e `pnpm build` validados com sucesso.
