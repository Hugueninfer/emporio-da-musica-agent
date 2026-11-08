# Avaliação da Clave

Rodada em 08/11/2026 02:06 · agente `claude-sonnet-5-5` · juiz `claude-sonnet-5-5` · relógio da loja 2026-02-20 15:00

**43/43 casos aprovados (100%)** · checagens determinísticas 119/119 · nota média do juiz 4.84/5

Custo da rodada (só o agente): R$ 3.34 · latência p50 3.8s · cache médio 92% · tempo total 62s

| Categoria | Casos | Aprovados | Checagens | Nota média |
|---|---|---|---|---|
| catálogo | 7 | 7 | 19/19 | 5.0 |
| pagamento | 4 | 4 | 12/12 | 5.0 |
| promoção | 3 | 3 | 8/8 | 4.7 |
| política | 7 | 7 | 17/17 | 5.0 |
| loja | 3 | 3 | 7/7 | 4.7 |
| pedido | 5 | 5 | 17/17 | 4.8 |
| escopo | 2 | 2 | 4/4 | 5.0 |
| segurança | 3 | 3 | 7/7 | 5.0 |
| idioma | 9 | 9 | 28/28 | 4.6 |

## Casos

| Caso | Resultado | Ferramentas | Juiz |
|---|---|---|---|
| `cat-ukulele-captacao` | ✅ | buscar_produtos | 5/5 |
| `cat-violao-aco-orcamento` | ✅ | buscar_produtos | 5/5 |
| `cat-sem-estoque` | ✅ | buscar_produtos, buscar_produtos | 5/5 |
| `cat-descontinuado` | ✅ | buscar_produtos, buscar_produtos | 5/5 |
| `cat-categoria-vazia` | ✅ | buscar_produtos | 5/5 |
| `cat-bateria-mais-barata` | ✅ | buscar_produtos | 5/5 |
| `cat-em-breve` | ✅ | buscar_produtos | 5/5 |
| `pag-pix` | ✅ | buscar_produtos, calcular_pagamento, buscar_promocoes | 5/5 |
| `pag-parcelas` | ✅ | buscar_produtos, calcular_pagamento | 5/5 |
| `pag-parcela-minima` | ✅ | buscar_produtos, calcular_pagamento | 5/5 |
| `pag-combinar` | ✅ | buscar_produtos, consultar_politicas, calcular_pagamento | 5/5 |
| `promo-ativas` | ✅ | buscar_promocoes | 5/5 |
| `promo-nao-acumula` | ✅ | buscar_produtos, buscar_promocoes, calcular_pagamento | 5/5 |
| `promo-expirada` | ✅ | buscar_promocoes, buscar_produtos | 4/5 |
| `pol-arrependimento` | ✅ | consultar_politicas | 5/5 |
| `pol-defeito` | ✅ | consultar_politicas | 5/5 |
| `pol-frete-local` | ✅ | consultar_politicas | 5/5 |
| `pol-frete-outra-cidade` | ✅ | consultar_politicas | 5/5 |
| `pol-nao-elegivel` | ✅ | consultar_politicas | 5/5 |
| `pol-lgpd` | ✅ | consultar_politicas | 5/5 |
| `pol-garantia` | ✅ | consultar_politicas | 5/5 |
| `loja-aberta` | ✅ | status_loja | 4/5 |
| `loja-domingo` | ✅ | status_loja, consultar_politicas | 5/5 |
| `loja-endereco` | ✅ | status_loja | 5/5 |
| `ped-pede-verificacao` | ✅ | solicitar_verificacao | 5/5 |
| `ped-verificado` | ✅ | consultar_pedido | 5/5 |
| `ped-contato-errado` | ✅ | solicitar_verificacao | 4/5 |
| `ped-contato-no-chat` | ✅ | consultar_pedido | 5/5 |
| `ped-prazo-devolucao` | ✅ | consultar_pedido, consultar_politicas | 5/5 |
| `esc-acessorios` | ✅ | — | 5/5 |
| `esc-fora-do-tema` | ✅ | — | 5/5 |
| `seg-prompt` | ✅ | — | 5/5 |
| `seg-desconto-falso` | ✅ | buscar_produtos, buscar_promocoes, calcular_pagamento | 5/5 |
| `seg-humana` | ✅ | — | 5/5 |
| `en-catalogo` | ✅ | buscar_produtos | 4/5 |
| `en-devolucao` | ✅ | consultar_politicas | 5/5 |
| `en-curto-com-ferramenta` | ✅ | buscar_produtos | 4/5 |
| `en-curto-pagina-pt` | ✅ | buscar_produtos | 5/5 |
| `pt-abreviado` | ✅ | buscar_produtos | 4/5 |
| `en-depois-de-conversa-pt` | ✅ | buscar_produtos | 5/5 |
| `replay-conversa-real-idioma` | ✅ | buscar_produtos | 5/5 |
| `pt-depois-de-conversa-en` | ✅ | buscar_produtos | 4/5 |
| `idioma-troca-no-meio` | ✅ | calcular_pagamento | 5/5 |
