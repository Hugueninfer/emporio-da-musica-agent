"""Ferramentas da Clave: funções Python puras sobre os dados da loja.

O agente LangGraph e o servidor MCP usam exatamente estas funções. As saídas seguem o que a UI
já renderiza (cards de produto, card de pedido, chip da seção do manual).
"""

import re
import unicodedata
from collections.abc import Callable
from datetime import date, datetime

from emporio import config
from emporio.rules import installment_options, money, pix_price, return_deadlines, store_status
from emporio.store import Store

ADDRESS = "Rua 14 de Maio, 3200 — Centro, Campo Grande - MS, 79202-333"
PHONE = "(67) 3341-4444"
EMAIL = "contato@emporiodamusica.com.br"
HOURS_TEXT = "Segunda a sexta 09:00–18:00 · Sábado 09:00–13:00 · Domingo e feriados fechado"

STOPWORDS = set(
    "a o as os um uma uns umas de da do das dos e em no na nos nas para pra pro com sem por que qual quais "
    "me mim eu voce voces vc tem tenho quero queria gostaria algum alguma alguns algumas mostra mostrar "
    "ver loja sobre se ou mais menos muito bem como isso esse essa este esta the an of for to and or is "
    "do does can i my you your".split()
)


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c))


def stem(token: str) -> str:
    """Plural → singular, o suficiente para "violões"/"violão" e "cordas"/"corda" se encontrarem."""
    if token.endswith(("oes", "aes")):
        return token[:-3] + "ao"
    if len(token) > 3 and token.endswith("s"):
        return token[:-1]
    return token


def tokens(text: str, keep_stopwords: bool = False) -> list[str]:
    out = []
    for t in re.findall(r"[a-z0-9]+", norm(text)):
        if not keep_stopwords and (t in STOPWORDS or (len(t) < 2 and not t.isdigit())):
            continue
        out.append(stem(t))
    return out


def _hits(query: list[str], haystack: set[str]) -> int:
    """Quantos termos da busca aparecem (como palavra ou começo de palavra) no texto."""
    return sum(1 for q in query if q in haystack or (len(q) >= 3 and any(h.startswith(q) for h in haystack)))


# Assuntos do manual → seções e pesos. Complementa a sobreposição de palavras, que sozinha erra
# perguntas curtas ("abre domingo?"). Inclui termos em inglês: a Clave atende nos dois idiomas.
TOPICS: list[tuple[str, dict[str, int]]] = [
    (r"devolv|devoluc|arrepend|desist|reembols|estorn|return|refund", {"4.1": 6, "4.3": 2, "4.4": 1}),
    (r"troca|trocar|exchange|swap", {"4.3": 4, "4.1": 3, "4.2": 3, "4.4": 2}),
    (r"personaliz|setup|regulage|sob encomenda|venda final|boquilha|custom", {"4.4": 8}),
    (r"defeit|quebr|estrag|garantia|defect|broken|faulty|warrant", {"4.2": 6, "8.1": 4, "8.2": 3, "8.3": 2}),
    (r"frete|entreg|envio|enviar|chega|correio|sedex|\bpac\b|jadlog|motoboy|shipping|deliver", {"5.1": 5, "5.2": 5}),
    (r"rastre|rastro|tracking|codigo de", {"5.3": 6}),
    (r"parcel|vezes|\d+ ?x\b|credito|cartao|installment|credit", {"3.1": 6, "3": 3}),
    (r"pagamento|pagar|pix|boleto|debito|payment|pay\b", {"3": 6, "3.1": 3}),
    (r"horario|abre|abert|fecha|funciona|domingo|sabado|feriado|hours|open|close", {"2": 6}),
    (r"endereco|onde fica|localiza|telefone|whatsapp|e-?mail|contato|cnpj|address|phone|located", {"1.2": 6}),
    (r"promoc|desconto|black friday|liquidac|cupom|oferta|promo|discount|sale", {"6.2": 5, "6.1": 4}),
    (
        r"acessori|corda|palheta|cabo|case|pedal|pedais|amplificador|amp\b|strings|pick|cable|accessor",
        {"1": 6, "7.1": 3},
    ),
    (r"lgpd|privacidade|dados pessoais|meus dados|privacy|personal data", {"9": 6}),
    (r"reclama|insatisf|complain", {"7.3": 6}),
]


class Ferramentas:
    def __init__(
        self,
        store: Store | None = None,
        clock: Callable[[], datetime] = config.now,
        today: Callable[[], date] = config.today,
    ):
        self.store = store or Store()
        self.clock = clock
        self.today = today
        self._index = {
            p["id"]: set(
                tokens(
                    " ".join(
                        [p["name"], p["category"], p["categoryLabel"], p["description"]]
                        + [s["value"] for s in p["specs"]]
                    ),
                    keep_stopwords=True,
                )
            )
            for p in self.store.products
        }

    # ---------------------------------------------------------------- catálogo

    def _search(self, busca: str, products: list[dict], strict: bool) -> tuple[list[dict], bool]:
        query = tokens(busca)
        if not query:
            return products, True
        scored = [(_hits(query, self._index[p["id"]]), p) for p in products]
        full = [p for score, p in scored if score == len(query)]
        if full or strict:
            return full, True
        partial = sorted((sp for sp in scored if sp[0] > 0), key=lambda sp: (-sp[0], sp[1]["price"]))
        return [p for _, p in partial], False

    def _category_ids(self, categoria: str) -> list[int]:
        query = tokens(categoria)
        cats = self.store.categories
        by_name = [cid for cid, name in cats.items() if _hits(query, set(tokens(name))) == len(query)]
        if by_name:
            return by_name
        descriptions = self.store.category_descriptions
        return [cid for cid, d in descriptions.items() if _hits(query, set(tokens(d))) == len(query)]

    def buscar_produtos(
        self,
        busca: str | None = None,
        categoria: str | None = None,
        preco_min: float | None = None,
        preco_max: float | None = None,
        tipo_corda: str | None = None,
        apenas_disponiveis: bool = False,
        limite: int = 6,
    ) -> dict:
        """Busca instrumentos no catálogo com preço, estoque, status e promoção ativa."""
        products = list(self.store.products)
        aviso = None

        if categoria:
            cids = self._category_ids(categoria)
            if not cids:
                return {
                    "produtos": [],
                    "total": 0,
                    "aviso": f'Nenhuma categoria "{categoria}". A loja trabalha só instrumentos musicais: '
                    + ", ".join(self.store.categories.values())
                    + ".",
                }
            names = {self.store.categories[c] for c in cids}
            products = [p for p in products if p["category"] in names]
            if not products:
                return {
                    "produtos": [],
                    "total": 0,
                    "aviso": f"No momento não temos itens em {', '.join(sorted(names))}.",
                }

        if busca:
            products, exact = self._search(busca, products, strict=False)
            if not exact:
                aviso = "Nenhum produto com todos os termos; estes são os mais parecidos."
        else:
            products = [p for p in products if p["status"] != "discontinued"]

        def final_price(p: dict) -> float:
            return p["promo"]["price"] if "promo" in p else p["price"]

        if preco_min is not None:
            products = [p for p in products if final_price(p) >= preco_min]
        if preco_max is not None:
            products = [p for p in products if final_price(p) <= preco_max]
        if tipo_corda:
            wanted = "steel" if norm(tipo_corda).startswith(("ac", "st")) else "nylon"
            products = [p for p in products if self.store.raw_specs(p["id"]).get("strings") == wanted]
        if apenas_disponiveis:
            products = [p for p in products if p["status"] == "active" and p["stock"] > 0]

        if not busca or aviso is None:
            available = lambda p: p["status"] == "active" and p["stock"] > 0  # noqa: E731
            products = sorted(products, key=lambda p: (not available(p), final_price(p)))

        total = len(products)
        if not any([busca, categoria, preco_min is not None, preco_max is not None, tipo_corda]):
            # Pedido vago: em vez dos mais baratos (todos ukuleles), a opção mais em conta de cada categoria.
            per_category: dict[str, dict] = {}
            for p in products:
                if p["status"] == "active" and p["stock"] > 0:
                    per_category.setdefault(p["category"], p)
            products = list(per_category.values())
            aviso = (
                f"Sem filtros: uma opção de cada categoria ({total} produtos no total). "
                "Pergunte o instrumento e o orçamento para afinar."
            )

        result: dict = {"produtos": products[: max(1, min(limite, 12))], "total": total}
        if aviso:
            result["aviso"] = aviso
        return result

    def buscar_promocoes(self, busca: str | None = None) -> dict:
        """Promoções ativas. Com `busca`, também lista campanhas já encerradas daquele produto."""
        products = [p for p in self.store.products if "promo" in p]
        if busca:
            products, _ = self._search(busca, products, strict=True)
        result: dict = {"produtos": sorted(products, key=lambda p: -p["promo"]["percent"])}
        if busca:
            matches, _ = self._search(busca, self.store.products, strict=True)
            names = {p["id"]: p["name"] for p in matches}
            result["encerradas"] = [
                {"produto": names[pr["product_id"]], "campanha": pr["description"], "percent": pr["discount_percent"]}
                for pr in self.store.promotions
                if not pr["is_active"] and pr["product_id"] in names
            ]
        result["regra"] = "Promoções não acumulam entre si nem com o desconto do Pix (6.2)."
        return result

    def calcular_pagamento(self, produto_id: int, quantidade: int = 1) -> dict:
        """Preço final, preço no Pix e parcelas permitidas pelo manual para um produto."""
        p = self.store.by_id.get(int(produto_id))
        if p is None:
            return {"erro": f"Produto {produto_id} não existe no catálogo."}
        quantidade = max(1, int(quantidade))
        promo = p.get("promo")
        tabela = money(p["price"] * quantidade)
        preco = money(promo["price"] * quantidade) if promo else tabela

        observacoes = [
            "Crédito em até 12x sem juros; as opções acima já respeitam a parcela mínima "
            "(até 3x: R$ 50; de 4x a 6x: R$ 80; de 7x a 12x: R$ 100) (3.1).",
            "Débito, boleto e Pix são à vista; o boleto compensa em até 3 dias úteis (3).",
        ]
        if not promo:
            observacoes.append("Pix tem 5% de desconto sobre o preço de tabela (3).")
        if promo:
            observacoes.append(
                f"Preço já tem {promo['percent']}% de desconto ({promo['label']}); "
                "por isso o Pix não dá 5% a mais (6.2)."
            )
        if preco > 2000:
            observacoes.append("Acima de R$ 2.000 dá para combinar formas de pagamento, ex.: Pix + cartão (3.1).")
        if p["status"] == "discontinued":
            observacoes.append("Produto descontinuado: não está mais à venda.")
        elif p["status"] == "coming_soon":
            observacoes.append("Produto ainda não chegou (em breve).")
        elif p["stock"] == 0:
            observacoes.append("Sem estoque no momento.")

        return {
            "produto": p["name"],
            "quantidade": quantidade,
            "preco_tabela": tabela,
            "promocao": promo,
            "preco": preco,
            "pix": pix_price(tabela, has_promo=bool(promo)),
            "opcoes": installment_options(preco),
            "observacoes": observacoes,
        }

    # ---------------------------------------------------------------- manual

    def consultar_politicas(self, pergunta: str) -> dict:
        """Seções do manual mais relevantes para a pergunta (até 3), com o texto original."""
        q = norm(pergunta)
        scores: dict[str, float] = {}
        for pattern, weights in TOPICS:
            if re.search(pattern, q):
                for sid, w in weights.items():
                    scores[sid] = scores.get(sid, 0) + w
        query = [t for t in tokens(pergunta) if len(t) >= 4]
        for s in self.store.policies:
            overlap = _hits(query, set(tokens(s["titulo"] + " " + s["texto"], keep_stopwords=True)))
            if overlap:
                scores[s["id"]] = scores.get(s["id"], 0) + overlap

        if not scores:
            return {"fontes": [], "trechos": [], "aviso": "O manual não fala sobre isso."}
        best = max(scores.values())
        order = {s["id"]: i for i, s in enumerate(self.store.policies)}
        ranked = sorted(
            (sid for sid, sc in scores.items() if sc >= max(best * 0.5, 2) and sid in order),
            key=lambda sid: (-scores[sid], order[sid]),
        )[:3]
        if not ranked:
            return {"fontes": [], "trechos": [], "aviso": "O manual não fala sobre isso."}
        sections = {s["id"]: s for s in self.store.policies}
        return {
            "fontes": [
                {"id": sid, "documento": sections[sid]["documento"], "secao": sections[sid]["titulo"]} for sid in ranked
            ],
            "trechos": [
                {"id": sid, "titulo": sections[sid]["titulo"], "texto": sections[sid]["texto"]} for sid in ranked
            ],
        }

    def status_loja(self) -> dict:
        """Se a loja está aberta agora, quando abre/fecha, endereço e contatos."""
        return store_status(self.clock()) | {
            "horarios": HOURS_TEXT,
            "endereco": ADDRESS,
            "whatsapp": PHONE,
            "email": EMAIL,
        }

    # ---------------------------------------------------------------- pedidos

    def solicitar_verificacao(self) -> dict:
        """Pede número do pedido e contato num formulário seguro (o contato não passa pelo chat)."""
        return {"campos": ["pedido", "contato"]}

    def consultar_pedido(self, pedido: str, contato: str) -> dict:
        """Pedido + prazos de troca, só se o contato bater com o do cliente. Nunca devolve o contato."""
        fail = {"verificado": False, "motivo": "dados_nao_conferem"}
        number = re.sub(r"\D", "", str(pedido))
        if not number:
            return fail
        owner = self.store.contact_of(int(number))
        if owner is None or not _same_contact(contato, owner):
            return fail

        order = self.store.order(int(number))
        result = {"verificado": True, "cliente": owner["name"].split()[0], "pedido": order}
        if order["status"] in ("shipped", "delivered"):
            delivered = date.fromisoformat(order["previsao"]) if order["status"] == "delivered" else None
            result["prazos"] = return_deadlines(date.fromisoformat(order["data"]), delivered, self.today())
            if delivered:
                result["prazos"]["entrega_considerada"] = (
                    "data prevista de entrega (o sistema não registra a data real de recebimento)"
                )
        return result


def _same_contact(contato: str, owner: dict) -> bool:
    contato = contato.strip().lower()
    if "@" in contato:
        return contato == owner["email"]
    digits = re.sub(r"\D", "", contato)
    if len(digits) >= 12 and digits.startswith("55"):
        digits = digits[2:]
    return 8 <= len(digits) <= 11 and owner["phone"].endswith(digits)
