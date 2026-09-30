# Aplicar a versão 0.5 sobre a versão 0.4

Base remota conferida: drtrafego/futbol_ready, commit
`af0a14e2f24e43cbc820e633eca2d7125b41031f`.

O código é uma extensão da versão 0.4, não um retorno ao projeto antigo. Não
mescle o renderer Phaser ou o layout antigo. Preserve server/auth.mjs,
api/session.js, .env.local e as variáveis privadas que já foram configuradas.

O pacote externo contém `aplicar-atualizacao.mjs` e `manifesto.json`.

```powershell
node aplicar-atualizacao.mjs --repo "C:\caminho\futbol_ready"
node aplicar-atualizacao.mjs --repo "C:\caminho\futbol_ready" --apply
```

O primeiro comando apenas verifica. O segundo cria backup fora do clone e copia
somente os arquivos listados com hashes compatíveis. Diante de conflito, nada é
copiado: compare a alteração mais recente e adapte apenas o trecho necessário.
Não use reset --hard, force push ou exclusão do repositório para evitar conflitos.

No clone atualizado execute `npm run verify`; esse comando também reconstrói
`dist/` e `JOGAR.html`. Revise `git diff`, confirme as alterações e envie ao GitHub.
A publicação na Vercel fica com o usuário. O aplicador não faz push nem deploy.

Antes de atualizar a versão publicada, exporte um backup JSON do jogo. Os saves
0.4 são migrados; mudança de domínio não transfere localStorage automaticamente.
As fixtures em qa/ são testes visuais e não devem ser carregadas no jogo normal.
