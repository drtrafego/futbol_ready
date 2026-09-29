# 04 — Pedido pendente: acesso simples para duas pessoas

O usuário quer enviar o jogo ao afilhado e mencionou login simples para apenas
duas pessoas. Nada disso foi implementado no executável desta entrega.

## Separar duas necessidades

**Perfil:** identifica quem está jogando e separa progresso, inclusive no mesmo
navegador. Um seletor de apelidos não é autenticação nem controle de acesso.

**Login:** verifica identidade/credencial fora do cliente e protege os recursos
necessários. Duas contas não tornam segura uma senha embutida no JavaScript.

Para não alterar o escopo silenciosamente, confirmar o alcance: só separar progresso
local ou também restringir acesso/sincronizar entre aparelhos. Implementar o pedido
sem confundir essas capacidades. A etapa de jogo pode ser enviada separadamente,
com o acesso marcado como pendente, sem fingir que há login funcional.

## Requisitos mínimos quando implementar login

Duas contas convidadas, sem cadastro público, usando apelidos. Não solicitar nome
completo, data de nascimento, telefone ou dados pessoais da criança. Cada conta
carrega apenas o seu save. Uma partida não é compartilhada entre os dois jogadores.

Usar provedor de autenticação mantido OU uma implementação pequena no servidor
revisada, com verificação segura de senha/credencial, sessão protegida e limite de
tentativas. Preferir solução suportada pelo ambiente real, consultando documentação
atual no momento de implementação. Não criar protocolo criptográfico próprio.

Credenciais e chaves ficam em configuração segura do servidor. Arquivo de exemplo
contém só nomes das variáveis, jamais senhas funcionais. Não colocar senha em
query string, localStorage, bundle, repositório ou conversa. Não adicionar um PIN
público hardcoded e chamá-lo de acesso privado.

Logout deve limpar sessão e estado sensível da memória, sem apagar permanentemente
o save. Trocar conta não pode carregar por um instante o progresso anterior.

## Progresso

O save local atual pode permanecer local por perfil; explicar que limpar navegador
ou trocar de aparelho não recupera automaticamente o progresso. Exportação é backup.
Sincronização em nuvem é uma capacidade separada: precisa de armazenamento durável,
autorização por usuário, limite de payload e política de conflitos entre abas/aparelhos.
Não usar arquivo temporário de função como banco e não instalar serviço pago sem aceite.

## Site, código e conteúdo público

Se o objetivo for impedir terceiros de executar o jogo, proteger também a entrega
do HTML/rotas relevantes, e não só esconder um botão de jogar. Repo público significa
que a leitura do código não é sigilo. Não prometer privacidade da aplicação inteira
com uma tela de login sem verificar a arquitetura e a forma de hospedagem.

## Testes

Entrar/sair, senha incorreta, sessão expirada, dois perfis independentes, acesso
de um perfil ao save do outro negado, contas sem cadastro público, ausência de segredos
no bundle, backup e restauração. Revalidar o CSP da versão estática antes de chamar API.
Documentar o que o usuário deverá configurar na Vercel, sem publicar por ele.
