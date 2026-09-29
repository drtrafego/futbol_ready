# 03 — Implementação, testes e envio

## 1. Limites do pacote

O executável está em `jogo_base/`. Os cinco arquivos doadores não estão importados
no build. Os requisitos de departamentos, campeonato e acesso são trabalho a fazer.
As capturas em `jogo_base/qa/` são registros da entrega anterior, não comprovação
visual da integração futura. O relatório atual está em `05_VALIDACAO_PACOTE.md`.

## 2. Preparar sem perder o trabalho local

Localize `drtrafego/futbol_ready`, confirme `git remote -v` e `git status --short`.
Não rodar `git reset --hard`, `git clean -fd` ou force push. Se houver arquivos
não commitados, pare para preservá-los; não misture mudanças de outro agente.

Com árvore limpa, atualize referências remotas, registre o SHA e crie uma branch
de segurança e uma branch de trabalho, com nomes únicos. Exportar o código doador
antes de modificar a raiz. O script de exportação é somente leitura em relação ao
repositório; grava o snapshot em outra pasta e nunca faz commit/push.

A raiz de produção deve passar a executar nossa versão. Não deixar um projeto
Next antigo em `/` e esconder o novo em uma subpasta que o usuário não abre.
Conserve o histórico no Git, não duas aplicações ativas concorrendo na raiz.

O usuário autorizou usar o repositório como destino. Não publicar nenhum projeto
na Vercel. Caso exista integração externa que faça deploy automático com push,
comunique isso antes de atualizar a branch de produção; não acione comandos de
deploy nem mude configurações da Vercel nesta tarefa.

## 3. Modelo de estado proposto

Uma raiz de estado com setores bem definidos, sem duas carteiras independentes:

```text
schemaVersion
arena       (gerente, kits, filas, campos, funcionários)
club        (nome, cores, escudo, reputação)
facilities  (lotes, níveis, estágios de obra, capacidade)
roster      (jogadores, titulares, reservas, capitão)
youth       (promessas, vagas, captação, desenvolvimento)
market      (ofertas, renovação, histórico de transferências)
tactics     (formação, postura)
competition (divisão, temporada, calendário, resultados, tabelas arquivadas)
finance     (uma carteira; caixa operacional; eventos idempotentes)
profile     (identificador local/usuário; sem senha no save)
```

Isso é uma proposta de organização, não um novo formato já implementado.
Evite renomear toda a base de uma vez. Defina um adaptador e uma migração incremental.
IDs de jogador e partida devem ser estáveis. Relógio e RNG devem ser injetáveis
nos testes. Limitar o delta simulado e tratar a retomada da aba sem prêmios arbitrários.

## 4. Motor, renderer e arte

O renderer lê o estado; não compra, não vende e não gera dinheiro. A UI chama ações
validadas. O evento que conclui uma venda ou partida atualiza o estado uma única vez;
partículas, popups e sons apenas representam esse evento.

A arena ilustrada tem projeção calibrada em `src/scene.js`. Ampliação do terreno
exige revalidar artToWorld/worldToArt, câmera, dimensões, pontos de interação e
caminhos. Não mover apenas o prédio na imagem mantendo a colisão no lugar antigo.

Preparar assets por departamento/estágio. O desenho de um prédio evoluído embutido
no fundo deve ser removido da camada neutra, não coberto por uma etiqueta “bloqueado”.
Usar sprites/variantes preservando a direção de arte. Não substituir todo o cenário
por retângulos nem entregar uma ilustração estática como se fosse jogo 3D completo.

Ao abrir painéis, pausar/interromper inputs do gerente apropriadamente. Ao fechar,
restaurar foco e joystick. Layout em retrato/paisagem precisa de acesso às novas áreas,
sem destruir o mapa para acomodar um menu enorme.

## 5. Resultados e classificação: contrato obrigatório

Criar calendário com `seasonId`, `roundId`, `matchId`, `homeClubId`, `awayClubId`.
Ao simular, gravar placar e resultado. O mesmo registro alimenta animação, estatísticas,
histórico, resultado da rodada e tabela dos dois clubes. Persistir antes de exibir replay.
Abrir/fechar modal, recarregar e repetir evento não podem conceder outro resultado.

Invariantes por clube: J = V + E + D; PTS = 3V + E; SG = GP - GC.
Para uma competição fechada com confrontos reais, total de GP = total de GC;
soma das vitórias = soma das derrotas; cada empate contribui para dois clubes.
Uma equipe não joga contra si, nem duas vezes na mesma rodada.

Se a temporada curta não for turno/returno completo, documentar o regulamento do
jogo de forma clara. Classificação por pontos, vitórias, saldo e gols, com desempate
final determinístico, é a referência do legado; adapte conscientemente.

Ao encerrar: guardar tabela final e resultados antigos; aplicar acesso/rebaixamento
uma vez; prêmio uma vez; limpar dados da nova temporada. Não limpar o patrimônio.

## 6. Migração e teste de progresso

A base usa `arena-de-bairro.save.v1` e backup correspondente, com validação.
O outro projeto tem formato próprio. Não juntar JSONs com spread nem aceitar um
save diferente só porque tem campos numéricos parecidos.

Antes de migrar, salvar cópia do original e identificar origem/versão. Adicionar
novos setores com defaults conservadores. Migração repetida deve dar o mesmo resultado.
Progresso incompatível não deve ser apagado automaticamente. Separar domínio do
site, identificador do jogador e versão de esquema. Exportar save continua disponível.

## 7. Testes mínimos por etapa

### Base e obra

- Os 48 testes da base continuam passando, ou qualquer mudança é explicada com regressão.
- Um jogo novo tem um campo e poucos lugares, no estado E no desenho.
- Cada compra debita uma vez e muda capacidade/estágio persistente.
- Departamento bloqueado/em obra não produz; funcionário não atravessa construção.
- Aumento de cadeiras mantém fila, ocupação e geração financeira dentro dos limites.

### Atletas e economia

- Revelar/promover/vender/contratar têm IDs únicos e custo/crédito único.
- Promoção preserva potencial; contratação não elimina jogador anterior.
- Reservas não aumentam força como se fossem todos titulares.
- Troca de posição, capitão e formação não deixam referências inválidas.
- Treino respeita limites e falta de saldo; base cheia é tratada explicitamente.
- Renovação de mercado e peneira não permitem spam gerando dinheiro sem custo/tempo.
- Marketing muda o efeito declarado; desativar um departamento remove efeito futuro.
- x1/x10/max respeitam arredondamento, limite de nível, saldo e valores finitos.
- A operação não recebe renda duplicada do velho timer passivo.

### Competição

- Vitória/empate/derrota atualizam ambos os clubes corretamente.
- Tabela, últimos resultados, replay e histórico mostram o mesmo placar.
- Reexecutar a conclusão não duplica pontos, bônus ou avanço de rodada.
- Trocar temporada não carrega os gols anteriores e não perde o histórico arquivado.
- Acesso/rebaixamento têm limites inferior/superior e não apagam construções.
- Salvamento/restauração no meio da temporada preserva calendário e resultados.

### Interface e entrega

Testar no mínimo 360x800, 390x844, 844x390, 768x1024 e 1440x900. Abrir build por
HTTP e verificar rede, console, imagens, clique, teclado, toque e rotação. Se só
emulação ou HTML injetado estiverem disponíveis, declarar isso, sem dizer que testou
Android físico ou persistência real. Usar screenshots do executável, não mockups.

Completar jornada sem moedas de debug: operar, ampliar lugares, construir base,
formar/vender jovem, contratar reforço, melhorar CT, ativar marketing, disputar
partida, conferir tabela, salvar e retomar.

## 8. Build e gerenciador de pacotes

A nossa base tem `package-lock.json` e scripts npm sem dependências externas.
O repositório doador declara pnpm e Next. NÃO sobrepor os dois manifests/lockfiles.
Na branch nova, escolher conscientemente o manifesto da versão efetivamente usada
(nossa base, salvo mudança técnica explícita) e retirar configurações obsoletas da
raiz de produção, preservando o histórico/backup. Não manter dois lockfiles ativos.

Na base atual:

```powershell
npm.cmd ci --ignore-scripts
npm.cmd run verify
npm.cmd run preview
```

Para gerar o build desta base não é preciso Python, imagens novas, WSL ou Docker.
Ferramentas de tratamento de imagem só são necessárias se os assets forem refeitos.
A configuração estática incluída usa `dist`. Se adicionar API de login, revisar
rotas e cabeçalhos: o CSP atual possui `connect-src 'none'`, que bloquearia chamadas
de autenticação/nuvem. Liberar só os destinos necessários, não um wildcard geral.

## 9. Commit, revisão e envio

Não subir apenas um ZIP, um HTML isolado ou um documento de instruções. Enviar fonte,
assets necessários, testes, build/configuração reproduzível e documentação atual.
Não commitar node_modules, tokens, `.env`, credenciais, saves pessoais ou caches.

Revisar `git diff --stat`, diff de arquivos críticos e eventuais exclusões antes do
commit. Commit e push sem `--force`. Verificar o SHA da branch remota depois.

Destino final pretendido: `main`, após a integração validada. Trabalhar primeiro
em branch de segurança. Se a `main` mudar durante o trabalho ou tiver proteção,
integrar as mudanças conscientemente ou abrir PR, sem sobrepor trabalho alheio.
Reportar explicitamente quando o resultado está só em branch/PR e ainda não na `main`.

O Gemini deve usar a autenticação disponível na máquina. Se não tiver terminal ou
permissão de Git, não dizer que enviou: produzir as mudanças e explicar o bloqueio
real. O usuário fará a Vercel; nenhuma URL de deployment precisa ser inventada.
