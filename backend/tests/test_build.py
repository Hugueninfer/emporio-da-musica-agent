import json
import sqlite3


def q(built, sql):
    with sqlite3.connect(built["db"]) as db:
        return db.execute(sql).fetchall()


def test_tabelas_tem_todas_as_linhas(built):
    assert q(built, "select count(*) from products") == [(65,)]
    assert q(built, "select count(*) from orders") == [(20,)]
    assert q(built, "select count(*) from order_items") == [(22,)]
    assert q(built, "select count(*) from customers") == [(50,)]
    assert q(built, "select count(*) from promotions where is_active") == [(4,)]


def test_tipos_corrigidos(built):
    preco, estoque, specs = q(built, "select price_brl, stock_quantity, specs from products where product_id=81")[0]
    assert preco == 599.9 and estoque == 12
    assert json.loads(specs)["strings"] == "nylon"


def test_contato_normalizado(built):
    phone, email = q(built, "select phone, email from customers where customer_id=1")[0]
    assert phone == "67998123456"
    assert email == email.lower()


def test_pedido_sem_rastreio_vira_null(built):
    assert q(built, "select tracking_code, estimated_delivery from orders where order_id=9") == [(None, None)]


def test_manual_em_secoes(built):
    secoes = {s["id"]: s for s in json.loads(built["policies"].read_text(encoding="utf-8"))}
    assert {"1.2", "2", "3", "3.1", "4.1", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3", "6.2", "7.1", "8.1"} <= set(secoes)
    assert "7 (sete) dias corridos" in secoes["4.1"]["texto"]
    assert "R$ 80,00" in secoes["3.1"]["texto"]
    assert secoes["4.1"]["documento"] == "Política de Trocas e Devoluções"
    assert secoes["4.1"]["titulo"] == "4.1 Direito de Arrependimento (Compras Online)"
    # rodapés de página não vazam para o texto
    assert all("Página " not in s["texto"] for s in secoes.values())


def test_email_do_manual_sem_acento(built):
    secoes = {s["id"]: s for s in json.loads(built["policies"].read_text(encoding="utf-8"))}
    assert "contato@emporiodamusica.com.br" in secoes["1.2"]["texto"]
    assert "empório" not in secoes["1.2"]["texto"].split("contato@")[1][:20]


def test_whatsapp_unificado(built):
    texto = built["policies"].read_text(encoding="utf-8")
    assert "3321-4500" not in texto
    assert "(67) 3341-4444" in texto
