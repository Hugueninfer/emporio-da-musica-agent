# Promoção ativa, Pix que não acumula e promoção que já acabou

> Gerado por `backend/scripts/run_examples.py` com `claude-sonnet-5-5`. Relógio da loja fixo em 2026-02-20 15:00 (idioma da página: `pt`).

**Cliente:** Vi que o Crafter HT-100 tá em promoção. Se eu pagar no Pix ganho mais 5% em cima?

> 🔧 `buscar_produtos` `{"busca": "Crafter HT-100", "limite": 3}` → Crafter HT-100 Folk Aço Natural (R$ 1.967,18, −18%, 3 em estoque)
> 🔧 `buscar_promocoes` `{"busca": "Crafter HT-100"}` → Crafter HT-100 Folk Aço Natural (R$ 1.967,18, −18%, 3 em estoque)
> 🔧 `calcular_pagamento` `{"produto_id": 90}` → R$ 1.967,18 · Pix sem desconto (promoção) · até 12x de R$ 163,93

**Clave:** Não, os 5% do Pix não somam com a promoção. Promoções não acumulam com o desconto do Pix (manual, seção 6.2).

O **Crafter HT-100 Folk Aço Natural** está assim:
- Preço original: R$ 2.399,00
- Promoção "Desconto Exclusivo": **18% off**
- **Preço promocional: R$ 1.967,18**

Esse valor vale no Pix, no débito ou à vista. Se preferir parcelar, dá em até **12x de R$ 163,93 sem juros** no crédito (manual, seção 3.1). Como o desconto de 18% já é maior que os 5% do Pix, você não perde nada. Restam **3 unidades** em estoque.

*Sugestões:* Quais as formas de pagamento? · Como funciona a garantia? · Ver outros violões folk

**Cliente:** E aquela Black Friday do Tagima Woodstock, com 30%? Ainda dá pra pegar?

> 🔧 `buscar_promocoes` `{"busca": "Tagima Woodstock"}` → nenhum produto · encerradas: Black Friday −30%
> 🔧 `buscar_produtos` `{"busca": "Tagima Woodstock", "limite": 4}` → Tagima Woodstock Dreadnought Natural (R$ 899,00, 11 em estoque)
> 🔧 `calcular_pagamento` `{"produto_id": 91}` → R$ 899,00 · Pix R$ 854,05 · até 8x de R$ 112,38

**Clave:** Infelizmente não dá. A promoção de **30% da Black Friday** no **Tagima Woodstock Dreadnought Natural** já encerrou e não está mais valendo.

O preço atual é **R$ 899,00**, sem promoção ativa. Como não tem promoção, o **Pix tem 5% de desconto** e fica em **R$ 854,05** (manual, seção 3). No crédito, dá para parcelar em até 8x sem juros, com parcela mínima respeitada (manual, seção 3.1). Tem **11 unidades** em estoque.

É um dreadnought de tampo em spruce, com som potente. Funciona bem para strumming e fingerpicking.

*Sugestões:* Quais as formas de pagamento? · Ver outras promoções ativas · Comparar com o Crafter HT-100
