# Contrato de manutenção — Arena de Bairro 0.5

Este código já está implementado. Não é um roteiro para reconstruir.

O entrypoint é index.html -> src/main.js -> WorldSimulation/WorldRenderer/WorldUI.
O mapa contínuo usa a arena ilustrada da versão anterior como uma camada.
Não voltar ao campus como página separada, nem trocar a base por Next/Phaser.

A simulação original de 0.4 continua em simulation.js; as transações territoriais
e o treino com entrega de kits são estendidos por world-simulation.js. Alterar
nível/dinheiro em renderizadores é proibido. O treino só conclui ao fim da sessão;
uma obra só fornece seu benefício quando concluída. Não conceder material pelo
render. Preservar save/profissionais/tabelas da 0.4, mapa/obras da 0.5 e separação
entre os dois perfis locais.

Execute npm run verify. Os 102 casos atuais incluem 29 testes novos de mapa e
recursos. Para navegador consulte qa/browser-world.py: nele a adaptação de auth
local/memory storage é EXCLUSIVA do teste, nunca da publicação de produção.

Não enviar .env.local, configurações privadas, senhas, hashes reais ou segredos
para o GitHub. Não substituir variáveis de ambiente do usuário. Não fazer deploy
na Vercel. Para atualizar um repositório, comparar o commit de origem e preservar
alterações posteriores. O aplicador fornecido recusa arquivos divergentes.
