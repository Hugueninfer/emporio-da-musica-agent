from datetime import date, datetime

import pytest

from emporio.config import TZ
from emporio.tools import Ferramentas


@pytest.fixture(scope="module")
def f(store):
    return Ferramentas(
        store,
        clock=lambda: datetime(2026, 11, 7, 10, 30, tzinfo=TZ),
        today=lambda: date(2026, 3, 1),
    )


def ids(result):
    return [p["id"] for p in result["produtos"]]


class TestBuscarProdutos:
    def test_formato_igual_ao_da_ui(self, f):
        p = next(p for p in f.buscar_produtos(busca="GD20")["produtos"])
        assert p == {
            "id": 95,
            "name": "Takamine GD20 Dreadnought Natural",
            "category": "Violões",
            "categoryLabel": "VIOLÃO · DREADNOUGHT",
            "price": 2199.0,
            "stock": 5,
            "status": "active",
            "description": p["description"],
            "specs": [
                {"label": "Tampo", "value": "Cedro Sólido"},
                {"label": "Cordas", "value": "Aço"},
                {"label": "Formato", "value": "Dreadnought"},
                {"label": "Cor", "value": "Natural"},
            ],
            "finish": "natural",
            "ghost": "GD20",
        }

    def test_busca_sem_acento_e_no_plural(self, f):
        r = f.buscar_produtos(busca="violoes 7 cordas")
        assert {109, 110, 111, 112} <= set(ids(r))

    def test_filtros_de_preco_e_corda(self, f):
        r = f.buscar_produtos(categoria="violões", tipo_corda="aço", preco_max=800)
        assert r["total"] >= 3
        assert all(p["price"] <= 800 and p["category"] == "Violões" for p in r["produtos"])
        assert all({"label": "Cordas", "value": "Aço"} in p["specs"] for p in r["produtos"])

    def test_filtro_de_preco_considera_promocao(self, f):
        # Crafter HT-100 custa 2399 mas está com 18% (1967,18)
        assert 90 in ids(f.buscar_produtos(categoria="violões", preco_min=1900, preco_max=2000))

    def test_promocao_ativa_vem_no_produto(self, f):
        p = f.buscar_produtos(busca="Crafter HT-100")["produtos"][0]
        assert p["promo"] == {"percent": 18, "label": "Desconto Exclusivo", "price": 1967.18}

    def test_apenas_disponiveis_tira_sem_estoque(self, f):
        assert 96 in ids(f.buscar_produtos(busca="GF-3D"))
        assert 96 not in ids(f.buscar_produtos(busca="GF-3D", apenas_disponiveis=True))

    def test_descontinuado_so_aparece_quando_procurado(self, f):
        assert 113 not in ids(f.buscar_produtos(categoria="violões", limite=100))
        assert ids(f.buscar_produtos(busca="Shelby SN-7C")) == [113]

    def test_categoria_sem_produtos_avisa(self, f):
        r = f.buscar_produtos(categoria="sopro")
        assert r["total"] == 0 and "não temos" in r["aviso"]

    def test_categoria_desconhecida(self, f):
        r = f.buscar_produtos(categoria="pedais")
        assert r["total"] == 0 and "só instrumentos" in r["aviso"]

    def test_sem_filtro_mostra_uma_opcao_por_categoria(self, f):
        # pedido vago ("me ajuda a achar um instrumento"): variedade em vez de só os mais baratos
        r = f.buscar_produtos()
        categorias = [p["category"] for p in r["produtos"]]
        assert len(categorias) == len(set(categorias)) == 6
        assert all(p["stock"] > 0 and p["status"] == "active" for p in r["produtos"])
        assert "uma opção de cada categoria" in r["aviso"]

    def test_limite(self, f):
        r = f.buscar_produtos(categoria="ukuleles", limite=3)
        assert len(r["produtos"]) == 3 and r["total"] > 3


class TestPromocoes:
    def test_so_ativas(self, f):
        assert sorted(ids(f.buscar_promocoes())) == [90, 94, 121, 127]

    def test_encerradas_quando_pergunta_de_um_produto(self, f):
        r = f.buscar_promocoes(busca="Martin D-28 Dreadnought")
        assert r["produtos"] == []
        assert {"produto": "Martin D-28 Dreadnought Natural", "campanha": "Promoção de Páscoa", "percent": 15} in r[
            "encerradas"
        ]


class TestPagamento:
    def test_produto_sem_promocao_tem_pix(self, f):
        r = f.calcular_pagamento(95)
        assert r["preco"] == 2199.0 and r["pix"] == 2089.05
        assert r["opcoes"][-1] == {"parcelas": 12, "valor": 183.25}

    def test_promocao_nao_acumula_com_pix(self, f):
        r = f.calcular_pagamento(90)
        assert r["preco"] == 1967.18 and r["preco_tabela"] == 2399.0 and r["pix"] is None
        assert any("6.2" in o for o in r["observacoes"])

    def test_explica_juros_e_parcela_minima(self, f):
        obs = " ".join(f.calcular_pagamento(119)["observacoes"])
        assert "sem juros" in obs and "R$ 80" in obs

    def test_quantidade(self, f):
        assert f.calcular_pagamento(116, quantidade=2)["preco"] == 399.8

    def test_produto_inexistente(self, f):
        assert "erro" in f.calcular_pagamento(9999)


class TestPoliticas:
    @pytest.mark.parametrize(
        "pergunta, secao",
        [
            ("quero devolver, me arrependi da compra", "4.1"),
            ("meu violão veio com defeito", "4.2"),
            ("posso parcelar em 10x?", "3.1"),
            ("qual o endereço da loja?", "1.2"),
            ("vocês abrem domingo?", "2"),
            ("vendem cordas e palhetas?", "1"),
            ("can I return a guitar?", "4.1"),
            ("Comprei um violão com setup personalizado e quero trocar. Pode?", "4.4"),
            ("comprei na liquidação com venda final, posso trocar?", "4.4"),
        ],
    )
    def test_secao_certa_primeiro(self, f, pergunta, secao):
        r = f.consultar_politicas(pergunta)
        assert r["fontes"][0]["id"] == secao
        assert r["trechos"][0]["id"] == secao
        assert len(r["fontes"]) <= 3

    def test_frete_traz_as_duas_regioes(self, f):
        r = f.consultar_politicas("quanto custa o frete pra Dourados?")
        assert {"5.1", "5.2"} <= {s["id"] for s in r["fontes"]}

    def test_sem_resultado(self, f):
        r = f.consultar_politicas("qual a capital da França?")
        assert r["fontes"] == [] and "aviso" in r

    def test_fonte_no_formato_da_ui(self, f):
        fonte = f.consultar_politicas("devolução")["fontes"][0]
        assert fonte == {
            "id": "4.1",
            "documento": "Política de Trocas e Devoluções",
            "secao": "4.1 Direito de Arrependimento (Compras Online)",
        }


class TestLoja:
    def test_status_usa_o_relogio(self, f):
        s = f.status_loja()
        assert s["aberta"] is True and s["fecha_as"] == "13:00"
        assert "Rua 14 de Maio, 3200" in s["endereco"]

    def test_solicitar_verificacao(self, f):
        assert f.solicitar_verificacao() == {"campos": ["pedido", "contato"]}


class TestPedido:
    def test_telefone_confere(self, f):
        r = f.consultar_pedido("8", "(67) 99654-7821")
        assert r["verificado"] is True
        assert r["pedido"] == {
            "numero": 8,
            "status": "shipped",
            "data": "2026-02-15",
            "itens": [{"nome": "Kala KA-C Concert Mogno", "quantidade": 1}],
            "total": 349.9,
            "pagamento": "Débito",
            "rastreio": "BRJL5544332BR",
            "previsao": "2026-02-28",
            "motivo": None,
        }
        assert r["cliente"] == "Ana"

    def test_aceita_sem_ddd_e_email(self, f):
        assert f.consultar_pedido("8", "99654-7821")["verificado"] is True
        assert f.consultar_pedido("#8", " AnaCarol.Ferreira@coldmail.com ")["verificado"] is True

    def test_contato_errado_nao_revela_nada(self, f):
        r = f.consultar_pedido("8", "(67) 90000-0000")
        assert r == {"verificado": False, "motivo": "dados_nao_conferem"}
        assert f.consultar_pedido("999", "(67) 99654-7821") == r
        assert f.consultar_pedido("8", "1234")["verificado"] is False

    def test_saida_nunca_tem_contato(self, f):
        texto = str(f.consultar_pedido("8", "(67) 99654-7821"))
        assert "99654" not in texto and "@" not in texto

    def test_prazos_de_pedido_entregue(self, f):
        # pedido 7: comprado 03/02, entregue (previsão) 17/02; hoje = 01/03
        r = f.consultar_pedido("7", "(67) 99789-0123")
        assert r["verificado"] is True, r
        assert r["prazos"]["arrependimento_no_prazo"] is False
        assert r["prazos"]["defeito_ate"] == "2026-03-05" and r["prazos"]["defeito_no_prazo"] is True

    def test_cancelado_sem_prazos(self, f):
        r = f.consultar_pedido("17", f.store.contact_of(17)["phone"])
        assert r["pedido"]["motivo"].startswith("Pedido cancelado")
        assert "prazos" not in r
