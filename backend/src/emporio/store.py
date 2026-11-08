"""Leitura dos dados preparados por `emporio.data.build` e conversão para o formato da UI.

`Product` e `Order` seguem `frontend/lib/catalog.ts` e `frontend/lib/orders.ts`.
"""

import json
import re
import sqlite3
from pathlib import Path

from emporio.config import DB_PATH, POLICIES_PATH
from emporio.rules import promo_price

# Produtos com modelo 3D no site (acabamento e nome curto exibidos no card).
FINISHES = {95: ("natural", "GD20"), 90: ("spruce", "HT-100"), 96: ("sunburst", "GF-3D"), 121: ("uke", "CK-20")}
CATEGORY_SHORT = {1: "GUITARRA", 2: "BAIXO", 3: "BATERIA", 4: "TECLADO", 5: "VIOLÃO", 9: "UKULELE"}
STRINGS = {"steel": "Aço", "nylon": "Nylon"}
BODY_SHAPES = [
    ("Dreadnought", "Dreadnought"),
    ("Folk", "Folk"),
    ("7 Cordas", "7 cordas"),
    ("Soprano", "Soprano"),
    ("Concert", "Concert"),
    ("Tenor", "Tenor"),
    ("Barítono", "Barítono"),
]
PAYMENT = {"pix": "Pix", "debit": "Débito", "boleto": "Boleto"}


def body_shape(name: str, category_id: int) -> str | None:
    for needle, label in BODY_SHAPES:
        if needle in name:
            return label
    if category_id == 5:
        return "Eletroacústico" if "Elétrico" in name else "Clássico"
    return None


def product_specs(specs: dict, category_id: int, name: str) -> list[dict]:
    out: list[tuple[str, str]] = []
    if category_id in (5, 9):
        out += [("Tampo", specs["top"]), ("Cordas", STRINGS.get(specs["strings"], specs["strings"]))]
        if shape := body_shape(name, category_id):
            out.append(("Formato", shape))
        if specs.get("electronics") == "yes":
            out.append(("Captação", "Sim"))
        out.append(("Cor", specs["color"]))
    elif category_id in (1, 2):
        out += [
            ("Corpo", specs["body"]),
            ("Braço", specs["neck"]),
            ("Cordas", specs["strings"]),
            ("Cor", specs["color"]),
        ]
    elif category_id == 3:
        out += [("Cascos", specs["shells"]), ("Peças", specs["pieces"]), ("Cor", specs["color"])]
    elif category_id == 4:
        out += [("Teclas", specs["keys"]), ("Polifonia", specs["polyphony"]), ("Cor", specs["color"])]
    return [{"label": k, "value": v} for k, v in out]


def payment_label(method: str) -> str:
    if method in PAYMENT:
        return PAYMENT[method]
    m = re.fullmatch(r"credit_(\d+)x", method)
    return f"Crédito {m.group(1)}x" if m else method


class Store:
    """Catálogo, promoções, pedidos e manual carregados em memória (são poucos registros)."""

    def __init__(self, db_path: Path = DB_PATH, policies_path: Path = POLICIES_PATH):
        if not Path(db_path).exists():
            raise FileNotFoundError(f"{db_path} não existe. Rode: uv run python -m emporio.data.build")
        self.db_path = db_path
        with self._db() as db:
            self.categories: dict[int, str] = dict(db.execute("select category_id, name from categories"))
            self._products = [dict(r) for r in db.execute("select * from products order by product_id")]
            self.promotions = [dict(r) for r in db.execute("select * from promotions order by promotion_id")]
        self.active_promos = {p["product_id"]: p for p in self.promotions if p["is_active"]}
        self.products = [self._product(r) for r in self._products]
        self.by_id = {p["id"]: p for p in self.products}
        self.policies: list[dict] = json.loads(Path(policies_path).read_text(encoding="utf-8"))

    def _db(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.db_path)
        db.row_factory = sqlite3.Row
        return db

    def _product(self, r: dict) -> dict:
        cid, pid = r["category_id"], r["product_id"]
        shape = body_shape(r["name"], cid)
        item = {
            "id": pid,
            "name": r["name"],
            "category": self.categories[cid],
            "categoryLabel": CATEGORY_SHORT.get(cid, self.categories[cid].upper())
            + (f" · {shape.upper()}" if shape else ""),
            "price": r["price_brl"],
            "stock": r["stock_quantity"],
            "status": r["status"],
            "description": r["description"],
            "specs": product_specs(json.loads(r["specs"]), cid, r["name"]),
        }
        if promo := self.active_promos.get(pid):
            item["promo"] = {
                "percent": promo["discount_percent"],
                "label": promo["description"],
                "price": promo_price(r["price_brl"], promo["discount_percent"]),
            }
        if pid in FINISHES:
            item["finish"], item["ghost"] = FINISHES[pid]
        return item

    def raw_specs(self, product_id: int) -> dict:
        row = next(r for r in self._products if r["product_id"] == product_id)
        return json.loads(row["specs"])

    def order(self, number: int) -> dict | None:
        """Pedido no formato da UI, sem nenhum dado de contato."""
        with self._db() as db:
            o = db.execute("select * from orders where order_id = ?", (number,)).fetchone()
            if o is None:
                return None
            items = db.execute(
                "select p.name, i.quantity from order_items i join products p using (product_id) where order_id = ?",
                (number,),
            ).fetchall()
        return {
            "numero": o["order_id"],
            "status": o["status"],
            "data": o["order_date"],
            "itens": [{"nome": name, "quantidade": qty} for name, qty in items],
            "total": o["total_brl"],
            "pagamento": payment_label(o["payment_method"]),
            "rastreio": o["tracking_code"],
            "previsao": o["estimated_delivery"],
            "motivo": o["notes"],
        }

    def contact_of(self, number: int) -> dict | None:
        """Contato do dono do pedido. Uso exclusivo da verificação de identidade (LGPD)."""
        with self._db() as db:
            row = db.execute(
                "select c.name, c.phone, c.email from orders o join customers c using (customer_id) where order_id = ?",
                (number,),
            ).fetchone()
        return dict(row) if row else None
