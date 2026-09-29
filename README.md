# Arena de Bairro — edição visual 0.3

Esta versão aplica a arte aprovada ao protótipo jogável de **Arena de Bairro**. Não é o projeto Arena de Craques e não é apenas uma imagem de apresentação.

## O que foi implementado

O cenário ilustrado aparece dentro do renderizador. Sobre ele, o jogo movimenta gerente, roupeiro e visitantes, controla caminhos e colisões, transporta kits, atende torcedores, realiza partidas simplificadas, recolhe dinheiro e compra melhorias. Saldo, estoque, placares, objetivos e disponibilidade do segundo campo são derivados do estado real da simulação.

A interface segue as cores, os painéis claros, os botões verdes e a composição da referência. No celular, os controles ficam fixos e a câmera acompanha o gerente. O botão Visão geral permite enxergar a arena completa. Os destinos rápidos evitam depender de tocar em uma placa pequena.

**Limite visual importante:** este é um jogo 2.5D com cenário pré-renderizado e sprites, não uma cena modelada em 3D. Prédios, árvores, parte da torcida, atendentes ilustrados e jogadores pintados nos campos pertencem à arte estática. Há visitantes realmente simulados e uma bola de efeito, mas não física de futebol ou animação esquelética dos atletas. O desenho estático do material no depósito também não muda peça por peça; o contador é o estoque real. Não confunda os elementos decorativos com o estado do jogo.

A câmera aproximada usa uma variante sem a interface impressa na imagem. Na visão geral desktop, a arte original forma a moldura sob a interface real. A marca ilustrada é preservada; números e controles são substituídos por componentes do jogo. A separação manual dos sprites deixa pequenas limitações de recorte e textura, especialmente em aproximações grandes.

## Executar no Windows

Use Node.js 22.16 ou superior. Não precisa de WSL, Docker ou chave de API.

```powershell
npm ci
npm run dev
```

Abra o endereço informado no terminal, normalmente `http://127.0.0.1:5173`.

O arquivo `JOGAR.html` funciona como versão independente, com imagens e código incorporados. Para manter progresso, prefira o servidor local ou o site publicado e faça backups pelo menu.

```powershell
npm run verify
npm run preview
```

`verify` verifica sintaxe, executa 48 testes e cria a produção em `dist/`. O preview usa a porta 4173.

## Publicar na Vercel a partir do GitHub

Coloque os arquivos deste projeto em um repositório/branch de teste. A raiz escolhida na Vercel deve ser a pasta que contém `package.json` e `vercel.json`.

| Configuração | Valor |
|---|---|
| Framework | Other |
| Install Command | `npm ci --ignore-scripts` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Variáveis de ambiente | Nenhuma |

O `vercel.json` já contém essas definições e cabeçalhos de segurança. A pasta `assets/` é indispensável: o HTML de produção não deve ser publicado sozinho. `JOGAR.html` é a exceção, pois incorpora os recursos em um único arquivo.

**Nenhum deploy foi feito na sua conta. Nenhum repositório remoto foi alterado.** A integração com seu outro projeto exige analisar o código correspondente, que não foi incluído nesta correção.

## Arquitetura

- `src/config.js`: preços e pontos operacionais. O ponto de coleta foi alinhado à lateral do quiosque, para o gerente permanecer visível.
- `src/simulation.js`, `navigation.js`, `save.js`: regras e persistência da base Arena de Bairro.
- `src/scene.js`: projeção reversível entre mundo e ilustração.
- `src/render.js`: cenário, sprites, profundidade, placas e efeitos.
- `src/visual.css`: interface que acompanha a direção visual aprovada.
- `src/ui.js`, `input.js`, `main.js`: controles e integração.
- `assets/referencia-aprovada.png`: referência enviada/aprovada nesta conversa.
- `assets/arena-cenario.png`, `arena-mapa.png`: camadas do cenário usadas pelo jogo.
- `tools/prepare-assets.py`: preparação opcional das imagens; NÃO é necessário para compilar nem publicar. Requer Pillow, numpy e OpenCV caso você queira refazer os recortes.
- `qa/`: capturas reais e relatórios, incluindo limitações do ambiente de teste.

## Progresso e integração

O formato e as chaves do save de Arena de Bairro foram preservados. **Saves de Arena de Craques são diferentes e não foram convertidos.** O progresso é local, não sincronizado com a nuvem. Exporte um JSON antes de mudar de domínio, substituir arquivos ou experimentar outra versão.

Não há anúncios, compras com dinheiro real, backend, autenticação, multiplayer, pacote Android nem renda com a página fechada.

## Validação desta entrega

48 testes Node passaram. Foram aprovadas 32 verificações em Chromium e 5 verificações HTTP separadas, totalizando 37 registros em `qa/browser-report.json`. O teste de jornada comprou bilheteiro, roupeiro, tesoureiro e segundo campo com receitas produzidas pela simulação, sem injetar saldo.

O Chromium do ambiente bloqueia navegação, inclusive para localhost. Por isso, o HTML independente foi montado com `set_content`; o armazenamento do navegador foi substituído por um adaptador em memória e o gancho opcional de testes foi habilitado. As verificações HTTP foram realizadas separadamente com Python. Não foi validada persistência real entre reaberturas de um navegador, nem desempenho em Android/iPhone físicos ou um deploy real na Vercel. Veja `docs/VALIDACAO.md`.

## Referências técnicas

- Vercel, configuração estática: https://vercel.com/docs/project-configuration/vercel-json
- MDN, composição de imagens no Canvas: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage

A arte provém da imagem aprovada na conversa, não de uma biblioteca externa de modelos 3D. A consulta técnica e os testes desta edição foram feitos em 29/09/2026.
