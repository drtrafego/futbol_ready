# Arena de Bairro 0.6 — validação e limites

Data: 19/10/2026. Versão: Clube Vivo 0.6. Atualização de código pronta, sem push nem deploy.

## Resultados realmente executados

| Grupo | Resultado |
|---|---:|
| Testes Node | 155 aprovados, 0 falhas (102 herdados e 53 novos) |
| Jornada de interface | 52 verificações aprovadas, 0 falhas |
| Erros JavaScript não tratados na jornada | 0 |
| HTTP local com autenticação temporária | 15 verificações aprovadas |
| Aplicador e proteção de arquivos | 16 verificações aprovadas |
| Jornada econômica partindo de zero | 16 marcos aprovados |

A jornada econômica começou com zero moedas, um campo e nenhum funcionário concedido. Gerou receita pela simulação, contratou funcionários, abriu o segundo campo, construiu a lanchonete, pagou estoque, serviu cinco clientes, comprou o terreno da formação, construiu o CT, entregou kits e concluiu treino pago. Durou 635 segundos SIMULADOS, não 635 segundos de uso humano nem uma medição de retenção. As recompensas de objetivos só foram recebidas depois de ações concluídas.

## O que foi testado

A economia foi examinada em milhares de combinações de força, potencial e idade, além de jornadas reais de contratar/vender e promover/vender. As compras e vendas não geram lucro imediato; a promoção preserva a avaliação. Treinar continua consumindo moedas, kits e tempo.

O restaurante foi testado sem estoque, sem dinheiro, com entrega em rota, com gerente presente/ausente, com atendente, com automação paga, com espera e desistência. O ingresso não recebe mais bônus decorativo de alimentação. O mesmo torcedor reserva seu assento, visita o balcão e retoma o caminho, sem criar um segundo cliente fictício para cobrar.

O estádio mantém o jogo oficial separado dos campos locais, cobra ingressos quando o público chega, atualiza a tabela só no encerramento e não duplica gols, artilharia ou premiações após salvar e retomar. Jogar fora de casa não cria bilheteria no estádio próprio. O apito final põe a torcida em saída.

A interface foi exercitada por cliques: entrega de kit, recompensa, edição do clube, treinamento, contratar, vender, peneira, promover, contrato, gerar um PNG, encomendar alimentos e disputar uma partida oficial. Verificou-se que a gestão segue simulando o clube, que o menu continua pausando, que os campos de edição não são apagados e que a identidade do botão é preservada durante atualização de contadores.

Telas emuladas: 1440×900, 768×1024, 390×844, 320×568 e 844×390. Painéis dentro da viewport e sem overflow horizontal da página. As capturas avançadas usam fixtures com moedas de teste para alcançar rapidamente os cenários, separadas da jornada econômica iniciada do zero. Elas não representam o saldo padrão.

O HTTP foi exercitado em um processo Node real com usuários temporários e segredos gerados somente em memória. Confirmou-se HTML/assets, bloqueio dos arquivos privados, senha errada, origem incorreta, cookie HttpOnly/SameSite, restauração de identidade, logout e segundo usuário. Nenhuma senha solicitada pelo usuário foi usada ou registrada nestes testes.

O aplicador foi testado em uma base compatível e com o entrypoint atual do GitHub, cujo SHA foi verificado. Inclui dry-run, idempotência, preservação do renderer/configuração privada, conflitos antes de copiar, recusa de symlink, entrypoint incompatível e build incompatível. Não testa todas as possíveis falhas de disco ou concorrência em um Windows real.

## Origem e limite da comparação com GitHub

Commit remoto lido: `a056fe0b287c9afe631be82c25c7979535dfd90d` (`drtrafego/futbol_ready`). A leitura pela conexão GitHub funcionou. O terminal não conseguiu clonar o repositório. Portanto NÃO houve teste ponta a ponta de um clone integral do último commit.

Para a execução usou-se a base ilustrada 0.5 já entregue nesta conversa, mais os complementos. Os arquivos centrais de mundo, economia, competição, perfil, save e validação foram comparados por SHA Git com as versões remotas lidas. O entrypoint atual foi recuperado por leitura e sua identidade também foi confirmada. O instalador foi exercitado com o entrypoint anterior e com esse entrypoint atual; a demonstração foi compilada aplicando o instalador em uma base 0.5 limpa.

Os novos complementos não substituem os renderizadores nem o código herdado de simulação no repositório real. As diferenças gráficas posteriores do Gemini são preservadas pelo aplicador e ainda precisam de validação visual na URL de destino. O HTML de demonstração NÃO é uma cópia exata de todos os gráficos do commit remoto; não o envie no lugar do projeto.

## Limites do navegador

A tentativa de navegar em `file:` retornou `ERR_BLOCKED_BY_ADMINISTRATOR`. A jornada usou Playwright/Chromium com HTML injetado por `set_content`, acesso local de demonstração e um adaptador de localStorage em memória, exclusivamente no teste. Isso NÃO foi incluído em produção.

Não foram certificados nesta entrega: aparelhos físicos, Safari/Firefox, Windows nativo, desempenho térmico ou de bateria, persistência real entre reaberturas, URL publicada na Vercel, sincronização entre aparelhos, viralidade, retorno de usuários ou receita de anúncios. O áudio usa o mecanismo já existente; não houve avaliação auditiva humana. Nenhum multiplayer ou SDK de anúncios foi ativado.

## REA: tentativa real, sem atribuição falsa

Foi lida a documentação de `morluto/rea` e tentada a execução do pacote `rea-agents@6.7.0` contra o build do próprio Arena. A instalação falhou com `EAI_AGAIN` no registro npm; a clonagem também não pôde resolver o GitHub no terminal. O REA NÃO chegou a executar uma análise. Não houve APK de concorrente aberto, decompilado ou copiado. O Node disponível era 22.16.0; o package.json consultado do REA também declara um mínimo mais recente.

Os registros estão em `evidence/rea-*`. As descobertas e as implementações desta atualização resultam de leitura do código e dos testes acima, não de resultados do REA. O comando reproduzido na tentativa foi:

```text
npm exec --yes --fetch-retries=0 --fetch-timeout=6000 --package=rea-agents@6.7.0 -- rea analyze-javascript-application <build-local> --json
```

## Antes de disponibilizar para outras pessoas

Exporte um save na versão atual. Aplique primeiro em branch de teste, execute npm run verify e faça uma partida na URL real. Confirme que os novos módulos estão no build e que o renderer do Gemini foi mantido. Confirme login de ambos os perfis, salvar/reabrir, toque/rotação, uma venda e um jogo oficial com a arena funcionando. Não altere segredos nem publique o ZIP privado. O usuário continua responsável pelo deploy na Vercel.
