from datetime import date, datetime

from emporio.config import TZ
from emporio.rules import (
    holiday,
    installment_options,
    min_installment,
    pix_price,
    promo_price,
    return_deadlines,
    store_status,
)


def at(text: str) -> datetime:
    return datetime.fromisoformat(text).replace(tzinfo=TZ)


class TestParcelamento:
    def test_faixas_da_secao_3_1(self):
        assert [min_installment(n) for n in (2, 3, 4, 6, 7, 12)] == [50, 50, 80, 80, 100, 100]

    def test_corta_parcelas_abaixo_do_minimo(self):
        # R$ 300: 3x de 100 ok; 4x de 75 < 80 → fora
        assert [o["parcelas"] for o in installment_options(300)] == [1, 2, 3]

    def test_valor_alto_chega_a_12x(self):
        opcoes = installment_options(2399)
        assert opcoes[-1] == {"parcelas": 12, "valor": 199.92}
        assert len(opcoes) == 12

    def test_valor_baixo_so_a_vista(self):
        assert installment_options(80) == [{"parcelas": 1, "valor": 80.0}]

    def test_borda_exata_entra(self):
        # 4x de 80,00 exatos é permitido
        assert {"parcelas": 4, "valor": 80.0} in installment_options(320)


class TestPrecos:
    def test_pix_cinco_por_cento(self):
        assert pix_price(2199, has_promo=False) == 2089.05

    def test_pix_nao_acumula_com_promocao(self):
        assert pix_price(2399, has_promo=True) is None

    def test_preco_promocional_arredonda_centavos(self):
        assert promo_price(2399, 18) == 1967.18
        assert promo_price(549, 20) == 439.2


class TestPrazosDeTroca:
    def test_entregue_dentro_dos_prazos(self):
        p = return_deadlines(date(2026, 3, 1), date(2026, 3, 5), today=date(2026, 3, 10))
        assert p["arrependimento_ate"] == "2026-03-12"
        assert p["arrependimento_no_prazo"] is True
        assert p["defeito_ate"] == "2026-03-31"
        assert p["defeito_no_prazo"] is True
        assert p["garantia_legal_ate"] == "2026-06-03"

    def test_arrependimento_vencido_mas_defeito_ainda_vale(self):
        p = return_deadlines(date(2026, 3, 1), date(2026, 3, 5), today=date(2026, 3, 20))
        assert p["arrependimento_no_prazo"] is False
        assert p["defeito_no_prazo"] is True

    def test_ultimo_dia_ainda_conta(self):
        p = return_deadlines(date(2026, 3, 1), date(2026, 3, 5), today=date(2026, 3, 12))
        assert p["arrependimento_no_prazo"] is True

    def test_sem_entrega_nao_tem_arrependimento(self):
        p = return_deadlines(date(2026, 3, 1), None, today=date(2026, 3, 2))
        assert p["arrependimento_ate"] is None and p["arrependimento_no_prazo"] is None
        assert p["defeito_no_prazo"] is True


class TestHorario:
    def test_dia_util_aberta(self):
        s = store_status(at("2026-11-09T10:00"))  # segunda
        assert s["aberta"] is True and s["fecha_as"] == "18:00"

    def test_sabado_fecha_as_13(self):
        assert store_status(at("2026-11-07T12:59"))["aberta"] is True
        s = store_status(at("2026-11-07T13:00"))
        assert s["aberta"] is False
        assert s["abre"] == {"data": "2026-11-09", "dia": "segunda-feira", "quando": "segunda-feira", "hora": "09:00"}

    def test_antes_de_abrir_abre_hoje(self):
        s = store_status(at("2026-11-10T08:30"))
        assert s["aberta"] is False and s["abre"]["quando"] == "hoje"

    def test_depois_de_fechar_abre_amanha(self):
        assert store_status(at("2026-11-10T18:00"))["abre"]["quando"] == "amanhã"

    def test_feriado_fechado(self):
        s = store_status(at("2026-11-20T10:00"))  # Consciência Negra (sexta)
        assert s["aberta"] is False and s["feriado"] == "Dia da Consciência Negra"
        assert s["abre"]["data"] == "2026-11-21"

    def test_feriados_moveis_e_locais(self):
        assert holiday(date(2026, 4, 3)) == "Sexta-feira Santa"
        assert holiday(date(2026, 10, 11)) == "Criação do Estado de Mato Grosso do Sul"
        assert holiday(date(2026, 8, 26)) == "Aniversário de Campo Grande"
        assert holiday(date(2026, 11, 9)) is None
