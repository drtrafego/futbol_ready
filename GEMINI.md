# Versão 0.5 já implementada — aplicar e enviar, não reconstruir

Leia README.md e docs/VALIDACAO.md. Este projeto já contém o mapa contínuo, as
parcelas compráveis no chão, obras com funcionários, mudanças de cenário por
fase e treino consumindo moedas e kits entregues fisicamente no CT.

Destino: drtrafego/futbol_ready. Preservar todo o histórico Git e as alterações
posteriores ao commit af0a14e2f24e43cbc820e633eca2d7125b41031f.

Mantenha o código pronto desta versão e execute `npm run verify`. Não retorne à
0.3/0.4, não substitua o mapa pela velha tela de campus, não mude os perfis/senhas
e não acrescente outras funcionalidades antes de publicar esta correção.

O pacote de entrega tem `aplicar-atualizacao.mjs` e `manifesto.json` fora desta
pasta. O aplicador valida hashes, mostra as diferenças, cria backup dos arquivos
alterados e não toca nos segredos. Sem `--apply`, apenas verifica. Havendo conflito,
faça a comparação de código; nunca use reset --hard/force push para apagar trabalho.

Depois dos testes, commit e push autenticados no ambiente do usuário. Informe o
commit efetivamente enviado. O usuário fará a Vercel; não execute deploy.
