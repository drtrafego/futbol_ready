# Referência de mecânicas, NÃO a aplicação principal

Os cinco arquivos em `trechos_originais/` são cópias de arquivos lidos no commit
identificado em `ORIGEM.json`. Seus Git blob hashes foram reproduzidos e conferidos.

Eles NÃO estão integrados a `jogo_base`, não compõem um projeto independente e
contêm comportamentos que precisam de correção. Por exemplo, contratar/promover
substitui um jogador existente; a força soma o elenco inteiro; a função de renda
offline existe, mas não é aplicada na inicialização consultada.

Leia `../docs/02_INVENTARIO_JOGABILIDADE.md` antes de adaptar. Para os demais módulos
(partidas, store, save, componentes e testes), use o repositório local ou exporte
um snapshot com `../ferramentas/exportar-referencia-git.mjs`. Não restaure as telas,
a cena Phaser, a arquitetura visual ou as instruções antigas como base do jogo novo.
