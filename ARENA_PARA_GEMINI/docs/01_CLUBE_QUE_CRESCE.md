# 01 — Do campinho a um clube completo

## Direção central

O jogador deve sentir que está construindo um clube, não preenchendo menus.
O mapa permanece a tela principal. Os espaços ganham vida quando são construídos:
trabalhadores chegam, atletas treinam, a torcida ocupa lugares e receitas aparecem
onde as operações acontecem. Painéis servem para decidir e administrar esses espaços.

A aparência é a da referência incluída em `jogo_base/assets/referencia-aprovada.png`.
A operação é a da nossa base ilustrada. Do GitHub antigo vêm regras e decisões
esportivas úteis; não sua apresentação nem seu ciclo de clique repetitivo.

Este documento contém REQUISITOS PARA IMPLEMENTAÇÃO, não descrição do que já funciona.
Estágios e números sugeridos abaixo são propostas de design ajustáveis após testes.

## Uma nova partida

Um único campo operacional, seis lugares como ponto de partida compatível com a
configuração atual, depósito e atendimento simples. O segundo campo e os demais
espaços avançados não estão prontos. Há terrenos demarcados indicando onde crescer.
Não conceder saldo de demonstração nem carregar o save de uma arena expandida.

O clube pode começar com o elenco mínimo necessário e a diretoria em uma salinha
simples. CT e base profissionais dependem de investimento; o futebol inicial não
pode ficar bloqueado por uma compra impossível de pagar.

O tutorial apresenta primeiro pegar kits → preparar → atender → recolher → contratar.
Depois abre gradualmente o estádio, os departamentos e a carreira. Não abrir dez
modais na primeira sessão. Rebaixamento não destrói prédios já conquistados.

## Departamentos e transformações no mapa

| Espaço | Começo | Evolução visível proposta | Efeito que precisa existir na regra |
|---|---|---|---|
| Estádio/arquibancadas | Um campo, poucos bancos ou cadeiras | Mais fileiras, setores, cobertura, iluminação e placar | Capacidade real, ocupação e receita por atendimento |
| Bilheteria | Um guichê manual | Funcionário, mais catracas e fila organizada | Menos espera e maior capacidade de atendimento |
| Depósito/roupeiro | Estoque pequeno e trabalho manual | Prateleiras, carga maior, logística automatizada | Estoque e vazão de kits, sem perder a interação manual |
| Categoria de base | Terreno ou pequeno campinho de peneira | Sala simples, campo próprio, alojamento/academia | Vagas, qualidade da captação e velocidade de desenvolvimento |
| Centro de treinamento | Área de cones/equipamentos | Campo estruturado, ginásio e centro de performance | Treino individual/coletivo, limite de sessões e evolução |
| Marketing | Um mural/faixa e equipe pequena | Sala, placas locais, novos painéis e sede comercial | Demanda, torcida e acordos fictícios com limites claros |
| Diretoria | Sala administrativa simples | Escritório, sala de reuniões, sede ampliada | Decisões de expansão, orçamento e objetivos de gestão |
| Comissão técnica | Apoio inicial básico | Vagas para treinador, preparador e analista | Bônus limitados para treino, base e tática |
| Lanchonete | Terreno/quiosque inicial | Balcão, estoque e área de mesas | Vendas reais aos visitantes e tarefas de abastecimento |
| Torcida | Pequeno grupo de bairro | Bandeiras, setores ocupados e mais movimento | Apoio/demanda; sem substituir o jogo por clicar infinitamente |

Diretoria e comissão não são o mesmo departamento. A comissão cuida do desempenho
esportivo; a diretoria administra o crescimento e as decisões do clube. Podem
começar no mesmo prédio pequeno e ganhar espaços separados depois.

Para cada departamento, definir em configuração: identificação, lote, ponto de
interação, estado bloqueado/em obra/ativo, nível, estágio visual, requisitos,
custo, efeito e limite. Construção bloqueada não gera dinheiro ou novos atletas.

### Estádio: exemplo de marcos

Proposta ajustável, não economia já validada: 6 → 12 → 24 → 48 → 96 lugares,
em marcos de obra. Melhorias pequenas podem preencher fileiras dentro de um marco.
Não renderizar centenas de agentes completos por causa de capacidade abstrata;
representar os setores de forma eficiente mantendo a ocupação lógica correta.

A divisão abre oportunidades, mas não substitui a compra. Promover o clube não
constrói tudo de graça, e comprar cadeiras não concede acesso esportivo.
Bilheteria, logística e demanda precisam acompanhar a capacidade: mais lugares
não podem gerar receita garantida se não houver público ou operação.

## Categoria de base: decisões completas

Fluxo esperado: construir → captar/revelar → desenvolver → avaliar → promover OU vender.
Mostrar nome fictício, idade, posição, força atual, potencial, evolução e valor.
A melhoria da base deve afetar a própria formação, não apenas a força genérica do clube.

A peneira ativa do projeto antigo pode virar uma atividade no campinho: o gerente
visita o local, inicia ou ajuda uma sessão, e a comissão assume a rotina depois.
Manter opção acessível por botão; não exigir clique rápido repetido para avançar.
Não revelar jovens gratuitamente sem limite por spam no botão.

Promover tira o atleta da base e o coloca no elenco sem apagar um profissional.
Preservar potencial, identidade e evolução. Vender exige confirmação, retira aquele
ID e credita o valor uma única vez. Não vender e promover a mesma promessa.
Base cheia precisa mostrar o que impede a próxima captação; uma revelação não pode
simplesmente desaparecer. Não acrescentar rendimento financeiro offline ilimitado.

## Elenco, mercado e treino

Preservar goleiro/defesa/meio/ataque, força, idade, titulares/reservas, treinos,
contratação, renovação de ofertas, troca de jogadores, posição, formação, postura
e capitão. O mercado apresenta preços e efeitos reais; uma contratação não é só card.

O código antigo substitui automaticamente o atleta mais fraco da mesma posição.
Adaptar: o substituído vai para o banco ou a contratação entra como reserva.
Não apagar um atleta sem venda/dispensa explícita. Manter limites do elenco.
A venda da base existe como referência; a venda de profissionais deve ser tratada
como extensão quando não houver função correspondente confirmada no código.

Treino individual melhora atributos dentro do potencial definido. CT e comissão
melhoram oportunidades/eficiência; tática não pode oferecer apenas bônus gratuitos
onde todas as alternativas superam a padrão. Tornar os efeitos compreensíveis.
O capitão precisa existir no elenco e ser revalidado se vendido/substituído.

## Marketing e diretoria

Marketing deve promover demanda e crescimento sustentável. Preferir patrocínios
fictícios do bairro inicialmente, metas claras e painéis que mudam no estádio.
Não é integração com plataforma de anúncios, não coleta dados de crianças e não
contém marcas pagantes reais. Custos e retornos são moedas fictícias do jogo.

O repositório contém uma melhoria chamada Marketing & Patrocínios, mas isso não
comprova um sistema completo de contratos. Contratos com duração/metas são uma
adaptação nova a implementar e testar, não uma função pronta a anunciar.

A diretoria concentra editar nome/sigla/cores/escudo, situação financeira, autorizar
novos lotes, metas e visão da carreira. O jogador pode comparar ampliar estádio,
contratar um reforço ou financiar a base. Não transformar tudo em compra automática
sem decisão, nem inventar empréstimos, dívida ou folha salarial complexa sem balancear.

## Campeonato, classificação e resultados

Acesso pela sede/diretoria, placa de competição ou botão compacto. O mapa continua
sendo a casa do jogador; a tabela abre em painel, sem restaurar a interface antiga.

Mostrar posição, clube, jogos, vitórias, empates, derrotas, gols marcados, sofridos,
saldo e pontos. Destacar o clube do usuário e as zonas de acesso/rebaixamento.
Explicar a ordenação adotada pelo jogo, sem apresentá-la como regulamento oficial.

Mostrar último resultado, resultados por rodada, próximos confrontos, temporada,
divisão e histórico. A linha “3 a 1” da animação deve ser o mesmo “3 a 1” do histórico
que atualizou ambos os clubes. Vitória = 3 pontos, empate = 1, derrota = 0 nesta regra.

O legado usa seis patamares, oito clubes na tabela e temporada curta de dez jogos.
Se mantiver esses números, implemente calendário curto coerente com confrontos reais;
ou ajuste calendário/rodadas e registre a decisão. Não chamar de ida e volta completo
um calendário de dez jogos entre oito clubes.

Escolher uma política explícita para os campos da arena. Uma opção é campo principal
receber jogos oficiais agendados e os demais gerarem atividade de treino/amistoso.
Outra é manter rodadas oficiais separadas, com nomes claros e recursos compartilhados.
Preservar a operação aprovada; NUNCA contar um mesmo jogo duas vezes ou misturar os
placares decorativos com resultados oficiais. Ao fechar um resultado, não simular outro.

Na virada da temporada: arquivar tabela/resultados, conceder prêmio uma vez, aplicar
acesso/rebaixamento uma vez e iniciar calendário limpo. Não reutilizar gols da temporada
anterior no novo saldo. Manter estádio, elenco e patrimônio salvo.

## Segurança de produto e escopo

Experiência pessoal para duas pessoas, sem monetização, anúncios reais ou rastreamento.
Não adicionar bate-papo, multiplayer ou pagamento. Sons opcionais e controle por toque
continuam acessíveis. Dados de crianças não são necessários para uma conta de jogador.
Um perfil pode usar apenas apelido. O acesso é tratado em documento próprio.

## Comparação visual para aprovação

Capturar: novo clube pequeno; primeiro aumento de cadeiras; construção da base;
CT maior; marketing ativo; diretoria ampliada; arena avançada; tabela e resultados.
No início não podem permanecer prédios maduros escondidos só por um rótulo bloqueado.
Nas versões avançadas a mesma linguagem visual precisa continuar reconhecível.
