"""Prepara os dados da loja para o agente.

CSVs → `store.db` (SQLite com tipos corretos) e o manual em PDF → `policies.json` (uma entrada por
seção numerada). Rodar sempre que `data/` mudar:

    uv run python -m emporio.data.build
"""

import csv
import json
import re
import sqlite3
import sys
from pathlib import Path

import pymupdf

from emporio.config import DATA_DIR, VAR_DIR

SCHEMA = """
create table categories (category_id integer primary key, name text not null, description text);
create table products (
  product_id integer primary key, name text not null, category_id integer not null references categories,
  price_brl real not null, description text, stock_quantity integer not null, status text not null,
  specs text not null, created_at text
);
create table promotions (
  promotion_id integer primary key, product_id integer not null references products,
  discount_percent integer not null, description text not null, is_active integer not null
);
create table customers (customer_id integer primary key, name text, phone text, email text, city text);
create table orders (
  order_id integer primary key, customer_id integer not null references customers, order_date text not null,
  status text not null, total_brl real not null, payment_method text not null, tracking_code text,
  estimated_delivery text, notes text
);
create table order_items (
  order_id integer not null references orders, product_id integer not null references products,
  quantity integer not null
);
"""


def _rows(data_dir: Path, name: str) -> list[dict[str, str]]:
    with open(data_dir / f"desafio_tecnico_ai_eng - {name}.csv", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _none(value: str) -> str | None:
    value = value.strip()
    return value or None


def build_db(data_dir: Path, path: Path) -> Path:
    path.unlink(missing_ok=True)
    with sqlite3.connect(path) as db:
        db.executescript(SCHEMA)
        db.executemany(
            "insert into categories values (?, ?, ?)",
            [(int(r["category_id"]), r["name"], r["description"]) for r in _rows(data_dir, "categories")],
        )
        db.executemany(
            "insert into products values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                (
                    int(r["product_id"]),
                    r["name"].strip(),
                    int(r["category_id"]),
                    float(r["price_brl"]),
                    r["description"].strip(),
                    int(r["stock_quantity"]),
                    r["status"],
                    json.dumps(json.loads(r["specs"]), ensure_ascii=False),
                    r["created_at"],
                )
                for r in _rows(data_dir, "products")
            ],
        )
        db.executemany(
            "insert into promotions values (?, ?, ?, ?, ?)",
            [
                (
                    int(r["promotion_id"]),
                    int(r["product_id"]),
                    int(r["discount_percent"]),
                    r["description"],
                    r["is_active"] == "1",
                )
                for r in _rows(data_dir, "promotions")
            ],
        )
        db.executemany(
            "insert into customers values (?, ?, ?, ?, ?)",
            [
                (
                    int(r["customer_id"]),
                    r["name"].strip(),
                    re.sub(r"\D", "", r["phone"]),
                    r["email"].strip().lower(),
                    r["city"],
                )
                for r in _rows(data_dir, "customers")
            ],
        )
        db.executemany(
            "insert into orders values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                (
                    int(r["order_id"]),
                    int(r["customer_id"]),
                    r["order_date"],
                    r["status"],
                    float(r["total_brl"]),
                    r["payment_method"],
                    _none(r["tracking_code"]),
                    _none(r["estimated_delivery"]),
                    _none(r["notes"]),
                )
                for r in _rows(data_dir, "orders")
            ],
        )
        db.executemany(
            "insert into order_items values (?, ?, ?)",
            [(int(r["order_id"]), int(r["product_id"]), int(r["quantity"])) for r in _rows(data_dir, "order_items")],
        )
    return path


# "4. Política de Trocas…" (seção) e "4.1 Direito de Arrependimento…" (subseção). Os itens numerados
# do fluxo 7.2 ("1.​ Saudação: …") têm um caractere invisível depois do ponto e não casam.
SECTION = re.compile(r"^(?P<id>\d{1,2})\. (?P<titulo>[A-ZÀ-Ú][^:]{2,60})$")
SUBSECTION = re.compile(r"^(?P<id>\d{1,2}\.\d) (?P<titulo>[A-ZÀ-Ú][^:]{2,70})$")
# Inconsistências do manual: o e-mail tem acento na seção 1.2 e o WhatsApp da seção 7 diverge do
# número que aparece na capa e na 1.2. Fica valendo o que aparece mais vezes.
FIXES = {"empóriodamusica": "emporiodamusica", "(67) 3321-4500": "(67) 3341-4444"}
NOISE = re.compile(r"^(Empório da Música Manual de Políticas e Procedimentos|Página \d+)$")


def _manual_lines(pdf: Path) -> list[str]:
    doc = pymupdf.open(pdf)
    lines: list[str] = []
    for page in list(doc)[1:]:  # a página 1 é a capa
        for line in page.get_text().splitlines():
            line = line.replace("​", "").strip()
            if line.startswith("Empório da Música — Sua música"):  # rodapé final
                return lines
            if line and not NOISE.match(line):
                lines.append(line)
    return lines


def _tidy(lines: list[str]) -> str:
    """Junta os marcadores "•" à linha seguinte e aplica as correções de contato (ver README)."""
    out: list[str] = []
    for line in lines:
        if out and out[-1] == "•":
            out[-1] = f"• {line}"
        else:
            out.append(line)
    text = "\n".join(out)
    for wrong, right in FIXES.items():
        text = text.replace(wrong, right)
    return text


def build_policies(pdf: Path, path: Path) -> Path:
    sections: list[dict] = []
    documento = ""
    current: dict | None = None
    body: list[str] = []

    def close():
        if current is not None:
            current["texto"] = _tidy(body)
            sections.append(current)

    for line in _manual_lines(pdf):
        top, sub = SECTION.match(line), SUBSECTION.match(line)
        if top or sub:
            close()
            m = top or sub
            if top:
                documento = m["titulo"]
            current = {"id": m["id"], "titulo": line, "documento": documento}
            body = []
        else:
            body.append(line)
    close()

    # Seções que só introduzem subseções e não têm texto próprio não ajudam a busca.
    sections = [s for s in sections if s["texto"]]
    path.write_text(json.dumps(sections, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def build(data_dir: Path = DATA_DIR, out_dir: Path = VAR_DIR) -> dict[str, Path]:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    return {
        "db": build_db(Path(data_dir), out_dir / "store.db"),
        "policies": build_policies(Path(data_dir) / "políticas_da_loja.pdf", out_dir / "policies.json"),
    }


if __name__ == "__main__":
    paths = build(*sys.argv[1:3]) if len(sys.argv) > 1 else build()
    for name, p in paths.items():
        print(f"{name}: {p}")
