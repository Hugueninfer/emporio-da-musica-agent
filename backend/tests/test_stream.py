import asyncio

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver

from emporio.agent.graph import build_agent
from emporio.api.stream import SuggestionFilter, ui_message_stream
from emporio.tools import Ferramentas
from tests.fakes import ScriptedModel, tool_call


def collect(agent, text="oi"):
    async def go():
        cfg = {"configurable": {"thread_id": "s1"}}
        inputs = {"messages": [HumanMessage(text)]}
        return [c async for c in ui_message_stream(agent, inputs, cfg)]

    return asyncio.run(go())


class TestSuggestionFilter:
    def test_tira_o_marcador_mesmo_quebrado(self):
        f = SuggestionFilter()
        pieces = ["Temos sim!\n<su", "gestoes>Ver uk", "uleles | Pagar no Pix</suges", "toes>"]
        visible = "".join(f.feed(p) for p in pieces) + f.flush()
        assert visible == "Temos sim!\n"
        assert f.suggestions == ["Ver ukuleles", "Pagar no Pix"]

    def test_texto_com_menor_que_nao_some(self):
        f = SuggestionFilter()
        visible = f.feed("parcelas < R$ 100 não") + f.flush()
        assert visible == "parcelas < R$ 100 não"

    def test_marcador_sem_fechamento(self):
        f = SuggestionFilter()
        assert f.feed("Oi!<sugestoes>A | B") + f.flush() == "Oi!"
        assert f.suggestions == ["A", "B"]


def test_sequencia_do_protocolo(store):
    model = ScriptedModel(
        script=[
            tool_call("buscar_produtos", {"busca": "GD20"}, id="c1"),
            AIMessage("O GD20 tem tampo sólido.\n<sugestoes>Parcelar | Ver outros</sugestoes>"),
        ]
    )
    chunks = collect(build_agent(model, Ferramentas(store), InMemorySaver()))
    types = [c["type"] for c in chunks]

    assert types[:2] == ["start", "start-step"]
    assert types[-3:] == ["data-suggestions", "finish-step", "finish"]
    assert types.index("tool-input-available") < types.index("tool-output-available") < types.index("text-start")

    tool_in = next(c for c in chunks if c["type"] == "tool-input-available")
    assert tool_in == {
        "type": "tool-input-available",
        "toolCallId": "c1",
        "toolName": "buscar_produtos",
        "input": {"busca": "GD20"},
    }
    out = next(c for c in chunks if c["type"] == "tool-output-available")
    assert out["output"]["produtos"][0]["id"] == 95

    text = "".join(c["delta"] for c in chunks if c["type"] == "text-delta")
    assert text == "O GD20 tem tampo sólido.\n"
    assert chunks[-3]["data"] == {"items": ["Parcelar", "Ver outros"]}


def test_erro_do_modelo_vira_chunk_de_erro(store):
    model = ScriptedModel(script=[])  # pop de lista vazia → exceção
    chunks = collect(build_agent(model, Ferramentas(store), InMemorySaver()))
    assert [c["type"] for c in chunks][-2:] == ["error", "finish"]
