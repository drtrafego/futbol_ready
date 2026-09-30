# Validação da entrega 0.4

## Comandos realmente executados
- npm run verify: 73 testes aprovados, zero falhas; sintaxe e build aprovados.
- qa/browser-delivery.py: 48 verificações aprovadas, zero erros JavaScript registrados.
- Verificação HTTP separada: 17 verificações aprovadas, incluindo os dois logins, senha errada, cookie, leitura de sessão, logout, recusa de origem estranha e acesso a imagens.

## Interface
Chromium no Linux, HTML compilado carregado por set_content. A fixture modifica a condição de login para o modo local e fornece armazenamento em memória. Isso testa os botões e a simulação; não certifica autenticação end-to-end em navegador real. A API foi verificada por requisições HTTP locais separadas.

Foram exercitados: ciclo manual desde zero; quatro painéis; compra de terreno; construção e treino da base; promoção; contratação; clique mantido durante atualização; capitão; formação; partida oficial como visitante; tabela/resultados; salvar e reabrir na fixture; isolamento do perfil Miguel. Resoluções adicionais: 390×844, 320×568, 844×390, 768×1024, 1280×720, além de 1440×900.

As imagens de fases avançadas usam fixtures com dinheiro e melhorias para testar essas telas. Não são um progresso obtido naturalmente nem uma validação do ritmo de jogo completo. A jornada inicial testa manualmente a geração de receita desde zero. Não há medição de retenção, balanceamento integral, bateria ou desempenho sustentado.

## Evidências
qa/verify-delivery.log, qa/browser-report.json, qa/http-report.json e capturas em qa/.

## Não executado
Push ao GitHub; deploy na Vercel; Android/iPhone físico; Safari/Firefox; persistência real entre reinicializações do navegador; teste de cobrança/planos. Não se apresenta esta entrega como produto comercial certificado ou livre de todo defeito.
