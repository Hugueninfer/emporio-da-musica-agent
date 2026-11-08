import json

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.checkpoint.memory import InMemorySaver

from emporio.agent.graph import ClaveContext, build_agent
from emporio.agent.prompt import SYSTEM_PROMPT
from emporio.tools import Ferramentas
from tests.fakes import ScriptedModel, tool_call


def run(agent, text, thread="t1", locale="pt", **extra):
    cfg = {"configurable": {"thread_id": thread}}
    return agent.invoke({"messages": [HumanMessage(text)], **extra}, cfg, context=ClaveContext(locale=locale))


def test_chama_ferramenta_e_responde(store):
    model = ScriptedModel(
        script=[tool_call("buscar_produtos", {"categoria": "ukuleles", "limite": 2}), AIMessage("Achei dois!")]
    )
    agent = build_agent(model, Ferramentas(store), InMemorySaver())
    out = run(agent, "tem ukulele?")

    tool_msg = next(m for m in out["messages"] if isinstance(m, ToolMessage))
    assert len(json.loads(tool_msg.content)["produtos"]) == 2
    assert out["messages"][-1].content == "Achei dois!"


def test_prompt_de_sistema_com_cache_e_contexto(store):
    model = ScriptedModel(script=[AIMessage("Hi!")])
    agent = build_agent(model, Ferramentas(store), InMemorySaver())
    run(agent, "hello", locale="en")

    system = model.calls[0][0]
    assert system.content[0]["text"] == SYSTEM_PROMPT
    assert system.content[0]["cache_control"] == {"type": "ephemeral"}
    assert "inglês (en)" in system.content[1]["text"]


def test_memoria_por_conversa(store):
    model = ScriptedModel(script=[AIMessage("Oi!"), AIMessage("De novo!")])
    agent = build_agent(model, Ferramentas(store), InMemorySaver())
    run(agent, "primeira", thread="abc")
    run(agent, "segunda", thread="abc")
    humanos = [m.content for m in model.calls[1] if isinstance(m, HumanMessage)]
    assert humanos == ["primeira", "segunda"]


def test_pedido_sem_verificacao_nao_vaza(store):
    model = ScriptedModel(script=[tool_call("consultar_pedido", {"pedido": "8"}), AIMessage("Preciso verificar.")])
    agent = build_agent(model, Ferramentas(store), InMemorySaver())
    out = run(agent, "status do pedido 8")
    tool_msg = next(m for m in out["messages"] if isinstance(m, ToolMessage))
    assert json.loads(tool_msg.content) == {"verificado": False, "motivo": "verificacao_necessaria"}


def test_pedido_verificado_pela_api(store):
    f = Ferramentas(store)
    model = ScriptedModel(script=[tool_call("consultar_pedido", {"pedido": "#8"}), AIMessage("Saiu para entrega.")])
    agent = build_agent(model, f, InMemorySaver())
    verificacao = f.consultar_pedido("8", "(67) 99654-7821")
    out = run(agent, "Pedido #8", verificacoes={"8": verificacao})
    tool_msg = next(m for m in out["messages"] if isinstance(m, ToolMessage))
    assert json.loads(tool_msg.content)["pedido"]["rastreio"] == "BRJL5544332BR"
