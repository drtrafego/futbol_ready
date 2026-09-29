# Ferramentas opcionais do pacote

## Conferir integridade antes de editar

Na pasta `ARENA_PARA_GEMINI`:

```powershell
node ferramentas/verificar-pacote.mjs
```

Compara tamanho e SHA-256 de cada arquivo com o manifesto. Depois de editar o
projeto, diferenças são esperadas; isto não substitui testes do jogo.

## Exportar as mecânicas do seu Git local

Antes de substituir a versão antiga no repositório, o Gemini pode executar:

```powershell
node ferramentas/exportar-referencia-git.mjs --repo "C:\projetos\futbol_ready" --ref HEAD --out "C:\backups\futbol-ready-referencia"
```

Adapte os caminhos à máquina. O script exige Git e Node, mas não usa PowerShell
específico, npm, serviços externos ou WSL. Ele só exporta fontes COMMITADAS do
commit solicitado. Para reproduzir a referência auditada, use
`--ref 0279da1a936982094e018ca70385ebe6db0a7c9e` se esse commit existir localmente.

Não executa fetch, clone, checkout, instalação, commit, push ou deploy. Não copia
as imagens antigas, `.env`, dependências ou arquivos não commitados. Isso não
substitui preservar mudanças locais. O destino precisa ficar fora do repositório
para não alterar sua árvore de trabalho. Um snapshot existente não é sobrescrito.

O snapshot completo de referência deve ficar fora do build de produção. Documentos
de design antigos não têm precedência sobre o `GEMINI.md` deste pacote.
