import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import InMemorySaver

from emporio.agent.graph import build_agent
from emporio.api.app import create_app
from emporio.metrics import MetricsLog, TurnMetrics
from emporio.tools import Ferramentas
from tests.fakes import ScriptedModel


def usage(total_in, out, read=0, write=0):
    return {
        "input_tokens": total_in,
        "output_tokens": out,
        "total_tokens": total_in + out,
        "input_token_details": {"cache_read": read, "cache_creation": write},
    }


class TestCusto:
    def test_separa_cache_da_entrada(self):
        m = TurnMetrics(model="claude-sonnet-5-5")
        m.add_usage(usage(total_in=3000, out=200, read=2500, write=0))
        assert (m.input_tokens, m.cache_read_tokens, m.output_tokens) == (500, 2500, 200)
        assert m.cache_hit == pytest.approx(2500 / 3000)

    def test_preco_com_cache(self):
        m = TurnMetrics(model="claude-sonnet-5-5")
        m.add_usage(usage(total_in=1_000_000 + 1_000_000, out=1_000_000, read=1_000_000))
        # 1M entrada (US$ 3) + 1M lidos do cache (US$ 0,30) + 1M saída (US$ 15)
        assert m.cost_usd == pytest.approx(18.30)

    def test_gravar_no_cache_custa_mais(self):
        m = TurnMetrics(model="claude-haiku-4-5")
        m.add_usage(usage(total_in=1_000_000, out=0, write=1_000_000))
        assert m.cost_usd == pytest.approx(1.25)

    def test_soma_varias_chamadas(self):
        m = TurnMetrics(model="claude-sonnet-5-5")
        m.add_usage(usage(100, 10))
        m.add_usage(usage(200, 20))
        assert m.model_calls == 2 and m.output_tokens == 30


def test_api_registra_turno_e_agrega(store):
    model = ScriptedModel(
        script=[
            AIMessage(
                content="",
                tool_calls=[{"name": "status_loja", "args": {}, "id": "c1"}],
                usage_metadata=usage(3000, 50, write=2800),
            ),
            AIMessage("Estamos abertos!", usage_metadata=usage(3100, 40, read=2800)),
        ]
    )
    f = Ferramentas(store)
    log = MetricsLog(None)
    app = create_app(build_agent(model, f, InMemorySaver()), f, log)
    with TestClient(app) as client:
        r = client.post(
            "/api/chat",
            json={"id": "m1", "messages": [{"role": "user", "parts": [{"type": "text", "text": "abertos?"}]}]},
        )
        finish = [line for line in r.text.splitlines() if '"type": "finish"' in line][0]
        report = client.get("/metrics").json()

    assert '"chamadas_modelo": 2' in finish
    turn = log.turns[0]
    assert turn["tokens"] == {"entrada": 500, "cache_leitura": 2800, "cache_escrita": 2800, "saida": 90}
    assert [t["nome"] for t in turn["ferramentas"]] == ["status_loja"]
    assert turn["primeiro_token_ms"] is not None
    assert report["respostas"] == 1 and report["ferramentas"]["status_loja"]["chamadas"] == 1
    assert report["cache_hit"] == pytest.approx(2800 / 6100, abs=1e-3)


def test_metricas_persistem_em_jsonl(tmp_path):
    path = tmp_path / "metrics.jsonl"
    m = TurnMetrics(model="claude-sonnet-5-5", thread_id="x")
    m.add_usage(usage(100, 10))
    MetricsLog(path).record(m.summary())
    assert MetricsLog(path).report()["respostas"] == 1
