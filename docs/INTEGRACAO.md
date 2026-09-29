# Integração com outro repositório

Nenhum repositório remoto foi modificado nesta entrega. A base usada é o Arena de Bairro disponibilizado nesta conversa, com a apresentação reconstruída em torno da arte aprovada.

Não sobreponha este ZIP inteiro a um projeto com lógica diferente. Crie uma branch e compare primeiro o formato do estado, os IDs de estações, o fluxo de entrada e o salvamento. Nesta base, a economia fica em `simulation.js`; o renderizador recebe o estado e não concede moedas. A projeção de `scene.js` traduz as coordenadas originais para a ilustração.

Para integrar a apresentação em React/Next.js, mantenha Canvas e a simulação no cliente, monte os recursos de `assets` em um caminho público explícito e traduza o ciclo de montagem/desmontagem para um componente. Não execute o loop de animação no servidor nem mantenha múltiplos listeners ao remontar um componente. Isso é orientação de integração, não uma conversão já executada.

Preserve a chave de save do projeto original ou implemente uma migração validada. Não importe um save de Arena de Craques como se fosse Arena de Bairro. O `vercel.json` desta entrega é para o site estático atual; um outro projeto Next.js pode exigir configuração distinta.

Antes de mesclar: testes da base original, testes desta versão, inspeção visual em celular e confirmação dos recursos que não podem regredir.
