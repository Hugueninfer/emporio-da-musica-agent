"""Gera os dados mock do front-end (lib/mock/*.ts) a partir dos CSVs da loja.

Uso (a partir da raiz do repositório):
    python frontend/scripts/gen_mock.py data frontend/lib/mock

Serve só para desenvolver a UI antes do backend Python existir; depois o
front passa a receber esses dados pelas ferramentas do agente.
"""

import csv
import json
import re
import sys

DATA_DIR, OUT_DIR = sys.argv[1], sys.argv[2]


def rows(name):
    with open(f"{DATA_DIR}/desafio_tecnico_ai_eng - {name}.csv", encoding="utf-8") as f:
        return list(csv.DictReader(f))


categories = {c["category_id"]: c["name"] for c in rows("categories")}
active_promos = {p["product_id"]: p for p in rows("promotions") if p["is_active"] == "1"}

# Produtos que têm render 360° (folhas de sprite em public/instrumentos/).
FINISHES = {"95": ("natural", "GD20"), "90": ("spruce", "HT-100"), "96": ("sunburst", "GF-3D"), "121": ("uke", "CK-20")}
CATEGORY_SHORT = {"1": "GUITARRA", "2": "BAIXO", "3": "BATERIA", "4": "TECLADO", "5": "VIOLÃO", "9": "UKULELE"}
STRINGS = {"steel": "Aço", "nylon": "Nylon"}
BODY_SHAPES = [("Dreadnought", "DREADNOUGHT"), ("Folk", "FOLK"), ("7 Cordas", "7 CORDAS"), ("Soprano", "SOPRANO"),
               ("Concert", "CONCERT"), ("Tenor", "TENOR"), ("Barítono", "BARÍTONO")]


def body_shape(name, category_id):
    for needle, label in BODY_SHAPES:
        if needle in name:
            return label
    if category_id == "5":
        return "ELETROACÚSTICO" if "Elétrico" in name else "CLÁSSICO"
    return None


def specs(raw, category_id, name):
    s = json.loads(raw)
    out = []
    if category_id in ("5", "9"):
        out += [("Tampo", s["top"]), ("Cordas", STRINGS.get(s["strings"], s["strings"]))]
        shape = body_shape(name, category_id)
        if shape:
            out.append(("Formato", shape.capitalize()))
        if s.get("electronics") == "yes":
            out.append(("Captação", "Sim"))
        out.append(("Cor", s["color"]))
    elif category_id in ("1", "2"):
        out += [("Corpo", s["body"]), ("Braço", s["neck"]), ("Cordas", s["strings"]), ("Cor", s["color"])]
    elif category_id == "3":
        out += [("Cascos", s["shells"]), ("Peças", s["pieces"]), ("Cor", s["color"])]
    elif category_id == "4":
        out += [("Teclas", s["keys"]), ("Polifonia", s["polyphony"]), ("Cor", s["color"])]
    return [{"label": k, "value": v} for k, v in out]


products = []
for p in rows("products"):
    cid = p["category_id"]
    shape = body_shape(p["name"], cid)
    item = {
        "id": int(p["product_id"]),
        "name": p["name"],
        "category": categories[cid],
        "categoryLabel": CATEGORY_SHORT[cid] + (f" · {shape}" if shape else ""),
        "price": float(p["price_brl"]),
        "stock": int(p["stock_quantity"]),
        "status": p["status"],
        "description": p["description"],
        "specs": specs(p["specs"], cid, p["name"]),
    }
    promo = active_promos.get(p["product_id"])
    if promo:
        item["promo"] = {"percent": int(promo["discount_percent"]), "label": promo["description"]}
    if p["product_id"] in FINISHES:
        item["finish"], item["ghost"] = FINISHES[p["product_id"]]
    products.append(item)

product_names = {p["id"]: p["name"] for p in products}
customers = {c["customer_id"]: c for c in rows("customers")}
order_items = {}
for i in rows("order_items"):
    order_items.setdefault(i["order_id"], []).append(
        {"nome": product_names[int(i["product_id"])], "quantidade": int(i["quantity"])})

PAYMENT = {"pix": "Pix", "debit": "Débito", "boleto": "Boleto"}


def payment(method):
    if method in PAYMENT:
        return PAYMENT[method]
    return f"Crédito {re.match(r'credit_(\d+)x', method).group(1)}x"


orders = []
for o in rows("orders"):
    c = customers[o["customer_id"]]
    orders.append({
        "numero": int(o["order_id"]),
        "status": o["status"],
        "data": o["order_date"],
        "itens": order_items.get(o["order_id"], []),
        "total": float(o["total_brl"]),
        "pagamento": payment(o["payment_method"]),
        "rastreio": o["tracking_code"] or None,
        "previsao": o["estimated_delivery"] or None,
        "motivo": o["notes"] or None,
        "_contato": {"telefone": re.sub(r"\D", "", c["phone"]), "email": c["email"].lower(), "nome": c["name"].split()[0]},
    })

HEADER = ("// Gerado por scripts/gen_mock.py a partir de data/*.csv. Não editar à mão.\n"
          "// Só para desenvolver o front-end até o backend Python existir.\n")

with open(f"{OUT_DIR}/catalog.ts", "w", encoding="utf-8", newline="\n") as f:
    f.write(HEADER + 'import type { Product } from "@/lib/catalog";\n\n'
            "export const CATALOG: Product[] = " + json.dumps(products, ensure_ascii=False, indent=2) + ";\n")

with open(f"{OUT_DIR}/orders.ts", "w", encoding="utf-8", newline="\n") as f:
    f.write(HEADER + "// Server-only: contém o contato usado só na verificação de identidade (LGPD).\n"
            'import "server-only";\nimport type { Order } from "@/lib/orders";\n\n'
            "export type MockOrder = Order & { _contato: { telefone: string; email: string; nome: string } };\n\n"
            "export const ORDERS: MockOrder[] = " + json.dumps(orders, ensure_ascii=False, indent=2) + ";\n")

print(f"{len(products)} produtos, {len(orders)} pedidos, {len(active_promos)} promoções ativas")
