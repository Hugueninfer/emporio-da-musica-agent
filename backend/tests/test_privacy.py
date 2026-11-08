import pytest

from emporio.api.privacy import find_verification, redact


@pytest.mark.parametrize(
    "texto",
    [
        "meu telefone é (67) 99654-7821",
        "liga no 67 99654 7821",
        "+55 67 996547821",
        "é 99654-7821",
        "email: AnaCarol.Ferreira@coldmail.com",
    ],
)
def test_redige_contato(texto):
    out = redact(texto)
    assert "[contato oculto]" in out
    assert "7821" not in out and "@" not in out


def test_nao_mexe_em_numero_de_pedido_nem_preco():
    texto = "Pedido #8 · tel. final 7821 — paguei R$ 2.399,00 em 12x"
    assert redact(texto) == texto


@pytest.mark.parametrize(
    "texto, pedido, contato",
    [
        ("Pedido 8, telefone (67) 99654-7821", "8", "(67) 99654-7821"),
        ("meu pedido é o #15 e o email anacarol.ferreira@coldmail.com", "15", "anacarol.ferreira@coldmail.com"),
        ("order 7 - phone 67 99789 0123", "7", "67 99789 0123"),
    ],
)
def test_encontra_verificacao_no_texto(texto, pedido, contato):
    assert find_verification(texto) == {"pedido": pedido, "contato": contato}


def test_sem_pedido_ou_sem_contato():
    assert find_verification("meu telefone é (67) 99654-7821") is None
    assert find_verification("cadê meu pedido 8?") is None
