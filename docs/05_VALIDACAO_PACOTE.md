# 05 — O que foi verificado nesta preparação

## Base recebida

Origem: `Arena-de-Bairro-Visual-Corrigido-Vercel.zip`, anexo desta conversa.
A cópia em `jogo_base/` mantém os 60 arquivos idênticos em bytes ao arquivo recebido,
conferidos depois da reconstrução. Nenhuma mecânica do jogo foi alterada nesta
preparação. Isso inclui o código, os assets, o HTML e os relatórios anteriores.

## Execução nova

Ambiente: Linux, Node 22.16.0, npm 10.9.2.

Comando executado dentro de `jogo_base`: `npm run verify`.
Resultado: verificação de sintaxe concluída; **48 testes aprovados, zero falhas**;
build recriado em `dist/index.html` com oito recursos; `JOGAR.html` recriado com
aproximadamente 6463 KiB. Log: `../verificacao-base-atual.log`.

Os cinco arquivos de código doador incluídos tiveram o Git blob SHA-1 calculado
com o cabeçalho e os bytes do arquivo e comparado com o hash retornado pelo GitHub.
Os cinco correspondem à fonte declarada em `../referencia_jogabilidade/ORIGEM.json`.

Foi testado o exportador em um repositório Git temporário local: exportação das
fontes, exclusão de `.env`, árvore inalterada, recusa de sobrescrita, recusa de
saída dentro do repo e erro para ref inexistente. A comparação dos 60 arquivos da
base também foi registrada em `../validacao-handoff.json`.

O manifesto SHA-256 permite conferir todos os arquivos do pacote depois de extraí-lo.
Ele não valida jogabilidade nem substitui os testes de integração futuros.

## O que NÃO foi feito

Não foram integrados os departamentos, elenco, campeonato, classificação, novos
estágios arquitetônicos ou login. Eles estão especificados para o Gemini implementar.
Não foi executado o projeto Next/Phaser doador, nem seus testes.
Não houve push, commit remoto, alteração de conta ou deploy na Vercel.
Não foi executada uma nova jornada visual de navegador nesta preparação.
Não houve teste em Windows ou celular físico.

As screenshots e relatórios dentro de `jogo_base/qa/` pertencem à entrega anterior.
Eles não comprovam funções esportivas que ainda não foram integradas. Para a base,
esses relatórios anteriores explicam o uso de Chromium com HTML injetado e
armazenamento em memória. O Gemini deve produzir nova evidência após suas mudanças.

## Arte

A referência aprovada e os cenários usados no código estão incluídos como PNG.
Não foi gerada nova arte nesta preparação. A base usa cenário pré-renderizado:
partes das arquibancadas, prédios e pessoas são estáticas. Para atender o pedido
novo de crescimento visível, o Gemini precisa criar a separação/variação por estágios
antes de dizer que os departamentos evoluem no mapa.
