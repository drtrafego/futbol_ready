# Arena de Bairro 0.4 — expansão e integração jogáveis

## Jogar imediatamente
Abra **JOGAR.html** como arquivo local no Chrome ou Edge, escolha Bernardo Cafure ou Miguel Matos e clique em entrar. O arquivo contém código e imagens. Esse modo é uma **demonstração local sem senha**. O modo online valida as senhas no servidor.

## Esta entrega contém código implementado
- Arena ilustrada com gerente, kits, fila, renda, funcionários e dois campos.
- Mapa do clube com três terrenos compráveis, em ordem: formação, estádio e sede.
- Estádio, categoria de base, centro de treinamento, marketing, diretoria, comissão e lanchonete.
- Até cinco fases e três melhorias por fase, com mudanças visuais mais perceptíveis na fase 3.
- Elenco, treino, reservas, capitão, formação, contratação, venda de reservas, formação/promoção/venda de jovens.
- Liga com 8 clubes e 14 rodadas para temporadas novas; saves antigos com 10 rodadas são preservados.
- Partida oficial acompanhável: a tabela só recebe o resultado ao final. Seu time é azul; adversário, laranja. Avisos de gol nosso e gol sofrido diferentes, com som opcional.
- Dois perfis e login online validado por uma pequena API, sem banco de dados.

A arena original mantém a arte ilustrada. **As áreas novas do clube são cenários 2.5D desenhados por código, mais simples que a imagem conceitual.** São clicáveis e têm efeitos na simulação; não são uma cena 3D completa. No campus, selecionam-se instalações e painéis; o gerente controlável permanece na arena original. Não há construção livre em qualquer pixel do mapa nem multiplayer.

## Execução local com login
Node 22.16 ou superior, sem dependências externas do jogo.

Copie o arquivo .env.local do pacote de configuração privada para esta pasta. Não o envie ao GitHub.

```powershell
npm.cmd run verify
npm.cmd run dev
```

Abra http://127.0.0.1:5173. Para um preview do build:

```powershell
npm.cmd run preview
```

Abra http://127.0.0.1:4173. Sem as variáveis do login, o servidor recusa a autenticação; use o JOGAR.html local para experimentar sem configuração.

## Progresso
Cada perfil tem save e backup próprios, no navegador. O login **não sincroniza progresso entre aparelhos** e o servidor não armazena partidas. Antes de atualizar, exporte o JSON de cada jogador. A versão faz validação/migração dos dados de carreira e corrige o formato do histórico antigo. Um dado ilegível é preservado, não sobrescrito silenciosamente.

## GitHub e Vercel
A base remota conferida é `drtrafego/futbol_ready`, commit `36c491029ea3fcf898b3f656be12f84bd4271469`. Não houve push ou deploy desta entrega.
Veja `docs/PUBLICAR.md`, `docs/ALTERACOES.md` e `docs/VALIDACAO.md`. No pacote de transferência há um aplicador com lista de arquivos e checagem do commit para não sobrescrever uma versão mais nova.

## Validação
73 testes de código; 48 verificações de interface; 17 verificações HTTP de login e recursos. Todos aprovados na última execução local. A interface foi exercitada em Chromium com HTML injetado e armazenamento em memória; HTTP e autenticação foram testados separadamente no servidor Node. Isso não substitui teste na URL da Vercel ou em celular físico.
