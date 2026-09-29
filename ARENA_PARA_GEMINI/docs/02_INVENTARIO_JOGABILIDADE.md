# 02 — Inventário do código doador e cuidados de adaptação

## Origem e limites desta leitura

Repositório: `drtrafego/futbol_ready`.
Commit consultado: `0279da1a936982094e018ca70385ebe6db0a7c9e`.
Leitura pelo conector GitHub de configurações, tipos, economia, elenco, partidas,
ações do store e componente raiz. Os testes desse projeto NÃO foram executados aqui.
Este inventário é um ponto de partida fundamentado no código, não uma afirmação de
cobertura exaustiva. O Gemini deve percorrer as demais actions, UI e testes localmente.

Cinco arquivos completos, com Git blob conferido, estão em
`../referencia_jogabilidade/trechos_originais/`. Os demais são referenciados por caminho;
exporte-os do Git local com o script fornecido. Não há snapshot integral neste ZIP.

URLs de auditoria abaixo usam o prefixo:
`https://github.com/drtrafego/futbol_ready/blob/0279da1a936982094e018ca70385ebe6db0a7c9e/`

## Mecânicas localizadas

| Mecânica | Evidência no código doador | Adaptação para a nossa arena |
|---|---|---|
| Arquibancada/bilheteria | `src/config/construcoes.ts`, id `bilheteria` | Capacidade/cadeiras e operação real; não outro timer pagando ingresso duplicado |
| Lanchonete | Mesmo arquivo, id `lanchonete` | Quiosque expansível, visitantes, serviço e receita coerente |
| Torcida/ação ativa | Mesmo arquivo, id `torcida`; `calcularValorClique` | Apoio no espaço da torcida sem trocar movimento por clicker obrigatório |
| CT | Id `treinamento`; `calcularForcaTime` | Campo físico, treino individual/coletivo e progresso limitado |
| Categoria de base | Id `base`; `gerarJovemPromessa` e timer/ação de peneira | Construção progressiva, revelação, desenvolvimento e lotação |
| Comissão | Id `comissao`; multiplicador em `calcularForcaTime` | Equipe esportiva e instalações próprias |
| Marketing | Id `marketing`, renda passiva configurada | Campanhas/demanda/patrocínios do jogo; novos contratos precisam implementação |
| Nome, sigla, cor e escudo | `ConfigTime`, `ConfigEscudo` em `src/types/game.ts`; actions criar/editar | Personalização na diretoria, aplicada à marca do clube no cenário |
| Elenco inicial | `gerarElencoInicial` | Onze jogadores, posições e banco preservados |
| Promessas | `gerarJovemPromessa`, campos potencial/valorVenda | Valores derivados da estrutura correta, sem perder potencial na promoção |
| Promover jovem | `promoverPromessa` | Adicionar ao profissional sem apagar outro jogador |
| Vender jovem | `dispensarPromessa`, action `venderJovemBase` | Confirmar venda e registrar transação única |
| Treino individual | `calcularCustoTreino`, `treinarTitular` | Limites de potencial/sessão; custo validado no núcleo |
| Mercado | `gerarMercadoTransferencias`, `contratarJogadorMercado` | Ofertas, preço, contratação e banco; evitar substituir titular silenciosamente |
| Renovar ofertas | `renovarMercadoAction` no store | Manter oportunidade de novos atletas sem abrir exploit ilimitado |
| Trocas/posição | `trocarJogadores`, `alterarPosicaoJogador` | Titulares explícitos e escalação válida |
| Formação | Tipos 4-3-3, 4-4-2, 3-5-2, 5-3-2; action `setFormacao` | Efeito na escalação e desempenho, não apenas texto |
| Postura tática | Ofensiva/equilibrada/defensiva; `setPosturaTatica` | Efeitos e escolhas equilibradas |
| Capitão | `definirCapitao`; bônus em `calcularForcaTime` | Identidade válida e bônus limitado |
| Gandula | `contratarGandulaAction` | Conferir tarefa real na cena antes de adaptar; não duplicar o roupeiro sem função |
| Compra em lote | x1/x10/max; `calcularCustoLote`, `calcularMaxCompravel` | Respeitar limites/obras e arredondamento da economia nova |
| Marcos de melhoria | `MARCOS_NIVEL`, multiplicador e progresso | Traduzir marcos em transformações físicas, rebalanceando os números |
| Divisões | `src/config/divisoes.ts`: seis patamares | Progressão de carreira e desbloqueios, não reset visual do estádio |
| Partida manual/agendada | `jogarPartidaAgora`, `tickPassivo` | Uma única execução de regra e resultado por confronto |
| Resultado individual | `PartidaResultado`, `simularPartida` | Placar, adversário, rodada, temporada e resultado persistente |
| Rivais/tabela | `gerarRivaisDivisao`, `simularRodadaRivais`, `obterTabelaCompleta` | Calendário coerente e estatísticas simétricas por jogo |
| Acesso/rebaixamento | `avaliarFimDeTemporada` | Aplicar uma vez após conclusão; arquivar temporada |
| Histórico/estatísticas | Tipos e atualizações no store | Separar histórico da rodada, da temporada e da carreira |
| Apresentação de partidas | `PartidaAnimadaModal.tsx`, `partidaEmAndamento` no componente raiz | Reaproveitar conceito de replay, NÃO o visual antigo; ler o componente completo |
| Salvar/carregar | `src/lib/save.ts`, actions e autosave em `JogoBernardo.tsx` | Migrar formatos cuidadosamente, preservar exportação e backup atuais |
| Renda com jogo fechado | Helper existe em economia, mas inicialização mantém o saldo | NÃO ativar offline ilimitado só porque a função foi encontrada |

Diretoria como espaço independente não aparece nos sete IDs de construção lidos.
É um REQUISITO NOVO do usuário, não algo comprovadamente pronto no legado.
“Direitos de TV” e “patrocínio” em textos de desbloqueios não provam contratos
funcionais. Conferir código chamado antes de anunciar qualquer módulo como existente.

## Problemas concretos que não devem ser copiados

**Substituição destrutiva do elenco.** Em `src/lib/elenco.ts`, promover e contratar
substituem o atleta mais fraco da mesma posição, em vez de preservá-lo no banco.
A promoção também não transfere o campo potencial para o novo Jogador. Corrigir
na adaptação e acrescentar testes de conservação de jogadores/identidade.

**Força do time.** `calcularForcaTime` soma o array de elenco inteiro. Com reservas
passa a contar jogadores que não estão escalados. Separar os onze titulares do
banco antes de usar a fórmula. Posturas e formações antigas dão bônus gerais;
rever o equilíbrio sem eliminar a escolha tática.

**Base: parâmetro incorreto.** A função `gerarJovemPromessa` chama o parâmetro de
`nivelBase`; nas actions lidas do store ela é chamada com `divisaoIndex`. Decidir
explicitamente qual combinação de infraestrutura e divisão determina a captação.
Não perpetuar a melhoria da base sem efeito na qualidade do jovem.

**Duas rotas para partidas.** O store repete a conclusão em ação manual e timer.
O bônus financeiro está explícito no caminho manual lido; a integração deve
normalizar recompensas, idempotência e avanço de calendário em uma única função.

**Tabela aproximada.** A simulação de rivais os atualiza independentemente, e o
adversário do usuário é sorteado na simulação da partida. Isso não é um calendário
de confrontos com resultado único para os dois clubes. Para a nova tabela e
resultados pedidos, construir fixtures reais e atualizar os participantes juntos.

**Virada de temporada.** A rotina lida reinicia contadores e conserva `historico`;
a tabela soma gols desse histórico. Separar temporadas evita carregar gols da
anterior para o novo campeonato. A ordenação e os limites precisam de testes.

**Economia duplicada.** A nossa base já paga bilheteria e partidas por eventos.
Importar a renda passiva inteira do store criaria pagamento adicional pela mesma
operação. Adaptar efeitos à demanda, capacidade, atendimento e acordos explícitos.

**Multiplicadores e custos.** Marcos, patamares até 120x e custos exponenciais
foram desenhados para outro ritmo. São referência, não números a copiar cegamente.
Verificar overflow, fator próximo de 1, limite de nível, x10/max, arredondamento e
saldo insuficiente. Não exceder o máximo de dinheiro aceito pelo save.

**Reset por URL.** O componente raiz lido limpa o jogo com `?reset=1`/`?limpar=1`.
Não importar esse comportamento destrutivo sem confirmação do jogador.

## Como completar o inventário no computador

Antes de trocar a raiz do repositório, exportar `src/`, `tests/`, `package.json`,
`PLANEJAMENTO.md` e metadados do commit. Ler integralmente o store, os componentes
ClubeView/ElencoView/EstadioView/PartidaAnimadaModal e os testes. Classificar cada
funcionalidade em pronta-na-base, adaptar-do-legado, nova ou fora-do-escopo, com
seu arquivo de origem e teste. A lista acima não autoriza esquecer mecânicas úteis
que só forem encontradas nessa segunda revisão.

Não executar nem promover a produção os arquivos de referência sem adaptação.
Não adotar as instruções de aparência antigas como substitutas deste briefing.

## Fontes consultadas

- Configurações: `src/config/construcoes.ts`, `src/config/divisoes.ts`.
- Contratos de estado: `src/types/game.ts`.
- Regras: `src/lib/elenco.ts`, `src/lib/economia.ts`, `src/lib/partidas.ts`.
- Integração: trechos de `src/store/useGameStore.ts` e `src/components/JogoBernardo.tsx`.
- URLs e hashes dos arquivos reproduzidos: `../referencia_jogabilidade/ORIGEM.json`.
