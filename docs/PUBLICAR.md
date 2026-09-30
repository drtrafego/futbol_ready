# Publicação do código já implementado

## GitHub
O Gemini deve aplicar este código, testar e enviar. Ele não precisa desenvolver novamente as funcionalidades listadas em ALTERACOES.md.
Use o aplicador do pacote de transferência para checar o commit antes de sobrescrever. Não apague o repositório, não execute force push e não envie .env.local, configuracao_privada/ ou valores das variáveis em commits.

## Vercel — projeto existente
Root Directory deve ser a pasta do repositório que contém package.json, vercel.json, src/ e api/. Ao usar o aplicador, é a própria raiz do repositório, não jogo/, dist/ ou ARENA_PARA_GEMINI/.

Framework: Other. Build: npm run build. Install: npm ci --ignore-scripts. Output: dist. O vercel.json já contém as configurações. A função está em api/session.js e importa server/auth.mjs. Publique essas pastas também; publicar somente dist não entrega o login.

Adicione ARENA_USERS_JSON e ARENA_SESSION_SECRET nas variáveis privadas do projeto. Os valores prontos estão no pacote privado separado. Não acrescente prefixo NEXT_PUBLIC_ e não coloque os valores em código ou vercel.json. Na interface da Vercel, o valor é somente o conteúdo à direita do sinal =, sem as aspas delimitadoras de .env.

Selecione Production e, para testar uma branch, Preview. Faça um novo deployment após definir as variáveis. Não foi realizado deployment nesta entrega.

## Validação após publicar
Abra /api/session: uma visita sem login deve devolver user:null. Entre com cada perfil, erre uma senha, saia e entre novamente. Recarregue após uma partida e confirme a carteira/classificação. Teste toque e rotação no celular. Verifique que os arquivos .env.local não podem ser acessados por URL. A API fecha o acesso quando as variáveis estão ausentes.

## Limites do acesso
O endpoint autentica a entrada na interface, mas o jogo é inteiramente cliente. Os arquivos e as imagens não são privados; um usuário técnico pode executar uma cópia local. O PIN não protege dados no aparelho nem substitui autenticação/estado em nuvem. As senhas curtas pedidas servem a este uso familiar; não são adequadas a dados sensíveis. Há limitação de tentativas por instância, não um bloqueio distribuído entre todas as funções. Não existe backend de save.

## Documentação técnica consultada
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/environment-variables
