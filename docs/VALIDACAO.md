# Verificação da versão 0.5 — 30/09/2026

## Executado nesta entrega

- 102 testes Node aprovados, 0 falhas: 73 casos anteriores e 29 casos de mapa,
  obras, caminhada, entrega, preservação de recursos, treinamento e migração.
- 63 verificações de interface aprovadas no Chromium, 0 falhas, 0 erros JavaScript
  não tratados registrados. Telas: 1440×900, 1024×768, 768×1024, 390×844, 320×568,
  844×390. Fluxo de compra/implantação da obra foi executado por cliques reais.
- 15 verificações HTTP locais: HTML de produção, assets, endpoint de sessão,
  rejeição de senha inválida, cookie HttpOnly, retomada de sessão e não exposição
  de arquivos privados. Credenciais temporárias de QA foram geradas em memória,
  sem substituir as credenciais solicitadas pelo usuário.
- Uma jornada de economia partiu de 0 moedas e sem material concedido. Pela
  simulação, contratou os três funcionários, abriu o segundo campo, comprou o
  terreno da formação, construiu o CT, pegou kits, caminhou até o CT, entregou
  os materiais e treinou um atleta. Foram cerca de 634 segundos SIMULADOS, não
  uma medição de tempo de jogo humano. Registros em qa/progression-report.json.
- `npm run verify` passou: sintaxe, testes e build. Não depende de pacotes novos.
- 9 verificações do aplicador passaram: hashes, backup externo, preservação de
  configuração privada, repetição sem mudanças, recusa de conflitos sem copiar
  e recusa de links simbólicos. Uma cópia limpa da 0.4 recebeu a atualização
  pelo aplicador e também passou nos 102 testes e no build.

## Limitações específicas

O ambiente de navegador bloqueou `file:` e localhost com
`ERR_BLOCKED_BY_ADMINISTRATOR`. A ferramenta agent-browser não estava instalada.
Usou-se Playwright/Chromium com o HTML de produção injetado via `set_content`.
Somente nesse teste, foi selecionado o modo demonstração local e um adaptador
localStorage em memória. Não foi alterada a autenticação da distribuição.

HTTP e autenticação foram exercitados separadamente no servidor Node real. A
verificação de HTTP não equivale a um deployment ou teste ponta a ponta na Vercel.
Não foram certificados celulares físicos, Safari/Firefox, Windows nativo,
consumo de bateria, desempenho sustentado ou persistência real entre reaberturas.

## Capturas e fixtures

As capturas são renders do jogo compilado no Chromium, não imagens conceituais.
Fixtures de expansão/fases recebem saldo exclusivamente para testar cenas e
obras avançadas. Níveis de fase 1 e 3 foram construídos através da simulação.
Os arquivos de QA não são carregados por padrão e não definem o saldo inicial.
O jogo real começa com 0 moedas, um campo e as expansões fechadas.

## Reproduzir

```text
npm run verify
node qa/progression.mjs
node qa/make-fixtures.mjs
python qa/browser-world.py
node qa/http-world.mjs
```

O teste de navegador exige Python/Playwright e Chromium. Não são requisitos para
jogar/publicar. Os JSONs de relatório e logs estão em qa/. Nenhum push/deploy foi
realizado nesta entrega. Confirme salvamento, login, toque e rotação na URL final.
