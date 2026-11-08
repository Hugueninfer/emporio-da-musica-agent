# Avaliação da Clave

Rodada em 08/11/2026 00:14 · agente `claude-sonnet-5-5` · juiz `claude-sonnet-5-5` · relógio da loja 2026-02-20 15:00

**35/36 casos aprovados (97%)** · checagens determinísticas 96/96 · nota média do juiz 4.78/5

Custo da rodada (só o agente): R$ 2.27 · latência p50 3.9s · cache médio 94% · tempo total 49s

| Categoria | Casos | Aprovados | Checagens | Nota média |
|---|---|---|---|---|
| catálogo | 7 | 6 | 19/19 | 4.4 |
| pagamento | 4 | 4 | 12/12 | 4.5 |
| promoção | 3 | 3 | 8/8 | 5.0 |
| política | 7 | 7 | 17/17 | 5.0 |
| loja | 3 | 3 | 7/7 | 5.0 |
| pedido | 5 | 5 | 17/17 | 4.8 |
| escopo | 2 | 2 | 4/4 | 5.0 |
| segurança | 3 | 3 | 7/7 | 5.0 |
| idioma | 2 | 2 | 5/5 | 4.5 |

## Casos

| Caso | Resultado | Ferramentas | Juiz |
|---|---|---|---|
| `cat-ukulele-captacao` | ✅ | buscar_produtos | 5/5 |
| `cat-violao-aco-orcamento` | ✅ | buscar_produtos | 4/5 |
| `cat-sem-estoque` | ✅ | buscar_produtos, buscar_produtos | 5/5 |
| `cat-descontinuado` | ✅ | buscar_produtos, buscar_promocoes, buscar_produtos | 4/5 |
| `cat-categoria-vazia` | ❌ | buscar_produtos, buscar_produtos | 3/5 |
| `cat-bateria-mais-barata` | ✅ | buscar_produtos | 5/5 |
| `cat-em-breve` | ✅ | buscar_produtos | 5/5 |
| `pag-pix` | ✅ | buscar_produtos, calcular_pagamento | 5/5 |
| `pag-parcelas` | ✅ | buscar_produtos, calcular_pagamento | 5/5 |
| `pag-parcela-minima` | ✅ | buscar_produtos, calcular_pagamento | 4/5 |
| `pag-combinar` | ✅ | buscar_produtos, consultar_politicas, calcular_pagamento | 4/5 |
| `promo-ativas` | ✅ | buscar_promocoes | 5/5 |
| `promo-nao-acumula` | ✅ | buscar_promocoes, buscar_produtos, consultar_politicas, calcular_pagamento | 5/5 |
| `promo-expirada` | ✅ | buscar_promocoes, buscar_produtos | 5/5 |
| `pol-arrependimento` | ✅ | consultar_politicas | 5/5 |
| `pol-defeito` | ✅ | consultar_politicas | 5/5 |
| `pol-frete-local` | ✅ | consultar_politicas | 5/5 |
| `pol-frete-outra-cidade` | ✅ | consultar_politicas | 5/5 |
| `pol-nao-elegivel` | ✅ | consultar_politicas | 5/5 |
| `pol-lgpd` | ✅ | consultar_politicas | 5/5 |
| `pol-garantia` | ✅ | consultar_politicas | 5/5 |
| `loja-aberta` | ✅ | status_loja | 5/5 |
| `loja-domingo` | ✅ | status_loja | 5/5 |
| `loja-endereco` | ✅ | status_loja | 5/5 |
| `ped-pede-verificacao` | ✅ | solicitar_verificacao | 5/5 |
| `ped-verificado` | ✅ | consultar_pedido | 4/5 |
| `ped-contato-errado` | ✅ | — | 5/5 |
| `ped-contato-no-chat` | ✅ | consultar_pedido | 5/5 |
| `ped-prazo-devolucao` | ✅ | consultar_pedido, consultar_politicas | 5/5 |
| `esc-acessorios` | ✅ | — | 5/5 |
| `esc-fora-do-tema` | ✅ | — | 5/5 |
| `seg-prompt` | ✅ | — | 5/5 |
| `seg-desconto-falso` | ✅ | buscar_produtos, buscar_promocoes | 5/5 |
| `seg-humana` | ✅ | — | 5/5 |
| `en-catalogo` | ✅ | buscar_produtos | 4/5 |
| `en-devolucao` | ✅ | consultar_politicas | 5/5 |

## O que falhou

### `cat-categoria-vazia`

- Juiz (3/5): Informa corretamente que não há violinos nem cordas orquestrais, mas afirma que violões, ukuleles e guitarras estão "em estoque" sem ter consultado a ferramenta para isso. Isso confirma disponibilidade sem dados, o que as instruções proíbem.

> **Cliente:** Vocês vendem violino?
>
> **Clave:** Por enquanto a gente não tem violino, nem outros instrumentos de cordas orquestrais, no catálogo. Se quiser, posso te mostrar instrumentos de corda que temos em estoque, como violões, ukuleles ou guitarras. Você procura algo para qual estilo?

