import pytest

from emporio.agent.prompt import turn_context
from emporio.api.language import detect_language
from emporio.config import now


@pytest.mark.parametrize(
    "texto, idioma",
    [
        ("Do you have nylon string guitars under R$ 500?", "en"),
        ("What's your return policy?", "en"),
        ("Hi! Are you open right now?", "en"),
        ("Tem violão de nylon até 500 reais?", "pt"),
        ("Qual o prazo para devolver um produto?", "pt"),
        ("Vocês estão abertos agora?", "pt"),
        ("oi", None),
        ("Pedido #8 · tel. final 7821", None),
        ("ok", None),
    ],
)
def test_detecta_idioma(texto, idioma):
    assert detect_language(texto) == idioma


def test_contexto_diz_o_idioma_do_cliente():
    # a nota vai no idioma da resposta, para não puxar o modelo para o outro idioma
    assert turn_context(now(), "pt", "en").startswith("[System context:")
    assert "the customer wrote in English" in turn_context(now(), "pt", "en")
    assert "a página está em português" in turn_context(now(), "pt", None)
    assert "the page is in English" in turn_context(now(), "en", None)
