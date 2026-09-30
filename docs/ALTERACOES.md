# Alterações entregues em 0.4

Base de comparação: Gemini em `36c491029ea3fcf898b3f656be12f84bd4271469`.

## Correções de integração
- Painéis esportivos usam delegação de eventos e atualização por revisão do estado. A renderização não substitui os botões repetidamente durante um clique.
- Elenco, base, mercado e instalações passam pela mesma Simulation; custos são debitados da carteira usada na arena.
- Vitória e derrota são calculadas pela perspectiva do jogador, inclusive quando visitante.
- Resultados são aplicados aos dois clubes. Calendário novo tem ida e volta; os calendários salvos anteriores são mantidos.
- Saves reconstruem a classificação a partir dos confrontos e preservam o histórico.
- Preparo gerado pelas partidas locais conecta a arena ao campeonato. Um jogo oficial não conclui instantaneamente por clique.

## Crescimento
Campo 1, campo 2, arquibancadas, bilheteria, estádio, base, treino, marketing, comissão, diretoria e lanchonete têm níveis de 0 a 15: cinco fases com três melhorias cada. Campo 1 já começa construído. Instalações em terrenos não comprados não podem ser construídas.

Terrenos: formação (500 moedas), estádio (1.200) e sede (1.800). É uma progressão predefinida, não um editor livre de mapas. Os valores estão em src/facilities.js.

Há efeitos de gameplay: capacidade, atendimento, ingresso/receita, custo de treinamento, formação de jovens, força do time, patrocínio e descontos administrativos. A comissão exige Série C. O clube começa com um campo e poucas cadeiras, sem precisar reiniciar para expandir.

## Acesso
Bernardo Cafure e Miguel Matos são os perfis. As senhas pedidas são configuradas somente fora do código público, por hashes no servidor. O HTML independente tem modo de demonstração e não pede senha. A API valida sessão online; o estado continua local.

## Limites visuais e técnicos
A arena usa arte pré-renderizada e sprites; o campus usa desenho procedural. Não foi produzido um novo conjunto de modelos 3D para cada fase. As animações de jogadores e bola são representações visuais de uma simulação de resultados, não física real de futebol. Renda só com o jogo ativo, sem ganho offline. Não há nuvem, competição direta entre os dois perfis ou proteção antitrapaça.
