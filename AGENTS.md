# Arena de Bairro — contrato de manutenção 0.4

Base: JavaScript + Canvas 2.5D + pequena API Node de sessão. Não migrar para Phaser/Next/React ou retornar ao clicker antigo sem nova solicitação. O visual da arena e os controles do gerente são a base aprovada.

Leia README.md, docs/ALTERACOES.md e docs/VALIDACAO.md. O código de desta entrega já implementa as funcionalidades: não tratá-lo como mera especificação. src/simulation.js é responsável pelas transações; render.js/campus.js apenas apresentam o estado. Não creditar dinheiro por animação. Preservar os saves e a diferença entre carteira e caixa.

Execute npm run verify antes de enviar. Não habilitar debug por padrão. Nunca enviar .env.local, configuracao_privada/ ou hashes/segredo reais ao repositório. .env.example deve conter apenas valores fictícios. O usuário faz a Vercel; não iniciar deploy. Se houver trabalho remoto após o commit registrado, comparar os arquivos e reconciliar, jamais forçar uma sobrescrita.

Limites: arte 2.5D em camadas, campus procedural, save local; sem multiplayer, sem dados sensíveis e sem alegação de antitrapaça. Código antigo em subpastas de referência não é o entrypoint. A página principal é index.html, o build gera dist e o HTML independente.
