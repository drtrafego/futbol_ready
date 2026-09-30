# Publicar a atualização implementada

Leia AGENTS.md e README.md. Você recebeu uma versão executável, não um pedido para desenvolver novamente o jogo. Preserve este renderer, estes controles e a operação. O usuário solicitou que você aplique os arquivos e faça o push no drtrafego/futbol_ready; ele cuidará da Vercel.

Antes de qualquer escrita, git fetch origin e examine main. O commit-base auditado é 36c491029ea3fcf898b3f656be12f84bd4271469. O aplicador externo do pacote valida esta base, a integridade dos arquivos e uma árvore de trabalho limpa. Em caso de divergência não force; faça a reconciliação por diff com uma branch de segurança.

Depois de aplicar, npm run verify. Não execute git add .: adicione apenas os arquivos listados no manifesto. Jamais envie configurações privadas. Faça commit e push da branch de atualização; confirme que main contém a atualização antes de comunicar que a produção foi atualizada. Não apague refs nem use force push. Reporte o hash efetivamente enviado e a branch; não invente URL de deploy.
